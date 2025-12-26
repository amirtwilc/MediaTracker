package com.amir.mediatracker.batch.processor;

import com.amir.mediatracker.aop.LogAround;
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
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class MediaItemProcessor implements ItemProcessor<MediaItemCSV, MediaItem> {

    private final GenreRepository genreRepository;

    private final PlatformRepository platformRepository;

    /**
     Process a single CSV item and convert it to a MediaItem entity.
     If Genre or Platform is not found, it will be created.
     *
     @param csvItem a single CSV item
     @return A MediaItem entity
     @throws Exception if the category is invalid
     */
    @Override
    @LogAround
    public MediaItem process(MediaItemCSV csvItem) throws Exception {
        MediaItem item = new MediaItem();

        try {
            // Set category
            item.setCategory(Category.valueOf(csvItem.getCategory()));
            item.setName(csvItem.getName().trim());

            if (csvItem.getYear() != null && !csvItem.getYear().trim().isEmpty()) {
                try {
                    item.setYear(Integer.parseInt(csvItem.getYear().trim()));
                } catch (NumberFormatException e) {
                    log.warn("Invalid year format for item {}: {}", csvItem.getName(), csvItem.getYear());
                    // Year remains null if invalid
                }
            }

            // Process genres (comma-separated)
            Set<Genre> genres = new HashSet<>();
            String[] genreNames = csvItem.getGenres().split(",");
            for (String genreName : genreNames) {
                String trimmedName = genreName.trim();
                Genre genre = genreRepository.findByNameIgnoreCase(trimmedName)
                        .orElseGet(() -> {
                            Genre newGenre = new Genre();
                            newGenre.setName(trimmedName);
                            newGenre = genreRepository.save(newGenre);
                            log.info("New genre was created: {}", newGenre);
                            return newGenre;
                        });
                genres.add(genre);
            }
            item.setGenres(genres);

            // Process platforms (comma-separated)
            Set<Platform> platforms = new HashSet<>();
            String[] platformNames = csvItem.getPlatforms().split(",");
            for (String platformName : platformNames) {
                String trimmedName = platformName.trim();
                Platform platform = platformRepository.findByNameIgnoreCase(trimmedName)
                        .orElseGet(() -> {
                            Platform newPlatform = new Platform();
                            newPlatform.setName(trimmedName);
                            newPlatform = platformRepository.save(newPlatform);
                            log.info("New platform was created: {}", newPlatform);
                            return newPlatform;
                        });
                platforms.add(platform);
            }
            item.setPlatforms(platforms);

            return item;
        } catch (IllegalArgumentException e) {
            throw new Exception("Invalid category: " + csvItem.getCategory());
        }
    }
}
