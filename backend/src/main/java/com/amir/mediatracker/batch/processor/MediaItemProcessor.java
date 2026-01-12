package com.amir.mediatracker.batch.processor;

import com.amir.mediatracker.aop.LogAround;
import com.amir.mediatracker.batch.exception.SkippableItemException;
import com.amir.mediatracker.batch.model.MediaItemCSV;
import com.amir.mediatracker.dto.Category;
import com.amir.mediatracker.entity.Genre;
import com.amir.mediatracker.entity.MediaItem;
import com.amir.mediatracker.entity.Platform;
import com.amir.mediatracker.repository.GenreRepository;
import com.amir.mediatracker.repository.PlatformRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.item.ItemProcessor;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class MediaItemProcessor implements ItemProcessor<MediaItemCSV, MediaItem> {

    private final static int MIN_YEAR = 1895; //The beginning of commercial cinema
    private final static int MAX_YEAR = 3000;

    private final GenreRepository genreRepository;
    private final PlatformRepository platformRepository;

    /**
     * Process a single CSV item and convert it to a MediaItem entity.
     * If Genre or Platform is not found, it will be created.
     @param csvItem a single CSV item
     @return A MediaItem entity
     */
    @Override
    @LogAround
    public MediaItem process(@NonNull MediaItemCSV csvItem) {
        MediaItem item = new MediaItem();

        try {
            item.setCategory(parseCategory(csvItem.getCategory()));
            item.setName(parseName(csvItem.getName()));
            item.setYear(parseYear(csvItem.getYear()));
            item.setGenres(parseGenres(csvItem.getGenres()));
            item.setPlatforms(parsePlatforms(csvItem.getPlatforms()));

            return item;
        } catch (SkippableItemException e) {
            log.warn("item {} is invalid because: {}", csvItem, e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("item {} threw an unexpected exception", csvItem, e);
            throw new SkippableItemException("Unexpected exception " + e.getMessage());
        }
    }

    private Category parseCategory(String value) {
        try {
            return Category.valueOf(value.trim().toUpperCase());
        } catch (Exception e) {
            throw new SkippableItemException("Invalid category: " + value);
        }
    }

    private String parseName(String value) {
        if (value == null || value.trim().isEmpty()) {
            throw new SkippableItemException("Name is mandatory");
        }
        return value.trim();
    }

    private int parseYear(String value) {
        try {
            int year = Integer.parseInt(value.trim());
            if (year < MIN_YEAR || year > MAX_YEAR) {
                throw new SkippableItemException("Year out of range: " + year);
            }
            return year;
        } catch (NumberFormatException e) {
            throw new SkippableItemException("Invalid year: " + value);
        }
    }

    //Genres are comma-separated
    private Set<Genre> parseGenres(String genresString) {
        Set<Genre> genres = new HashSet<>();
        String[] genreNames = genresString.split(",");
        Genre genre;
        for (String genreName : genreNames) {
            String trimmedName = genreName.trim();
            genre = genreRepository.findByNameIgnoreCase(trimmedName)
                    .orElseGet(() -> {
                        Genre newGenre = new Genre();
                        newGenre.setName(trimmedName);
                        newGenre = genreRepository.save(newGenre);
                        log.info("New genre was created: {}", newGenre);
                        return newGenre;
                    });
            genres.add(genre);
        }
        return genres;
    }

    //Platforms are comma-separated
    private Set<Platform> parsePlatforms(String platformString) {
        Set<Platform> platforms = new HashSet<>();
        String[] platformNames = platformString.split(",");
        Platform platform;
        for (String platformName : platformNames) {
            String trimmedName = platformName.trim();
            platform = platformRepository.findByNameIgnoreCase(trimmedName)
                    .orElseGet(() -> {
                        Platform newPlatform = new Platform();
                        newPlatform.setName(trimmedName);
                        newPlatform = platformRepository.save(newPlatform);
                        log.info("New platform was created: {}", newPlatform);
                        return newPlatform;
                    });
            platforms.add(platform);
        }

        return platforms;
    }
}
