package com.amir.mediatracker.batch;

import com.amir.mediatracker.batch.exception.SkippableItemException;
import com.amir.mediatracker.batch.model.MediaItemCSV;
import com.amir.mediatracker.batch.processor.MediaItemProcessor;
import com.amir.mediatracker.dto.Category;
import com.amir.mediatracker.entity.Genre;
import com.amir.mediatracker.entity.MediaItem;
import com.amir.mediatracker.entity.Platform;
import com.amir.mediatracker.repository.GenreRepository;
import com.amir.mediatracker.repository.PlatformRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.AssertionsForClassTypes.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MediaItemProcessorTest {

    @Mock
    private GenreRepository genreRepository;
    @Mock
    private PlatformRepository platformRepository;

    @InjectMocks
    MediaItemProcessor processor;

    @Test
    void shouldProcessValidCsv() {
        List<Genre> genres = List.of(new Genre(1L, "Sci-Fi", LocalDateTime.now()),
                new Genre(2L, "Drama", LocalDateTime.now()));

        List<Platform> platforms = List.of(new Platform(1L, "Netflix", LocalDateTime.now()),
                new Platform(2L, "Disney+", LocalDateTime.now()));
        MediaItemCSV csv = new MediaItemCSV(
                "MOVIE",
                "Inception",
                "2010",
                genres.get(0).getName() + "," + genres.get(1).getName(),
                platforms.get(0).getName() + "," + platforms.get(1).getName()
        );

        when(platformRepository.findByNameIgnoreCase(any()))
                .thenReturn(Optional.of(platforms.get(0)))
                .thenReturn(Optional.of(platforms.get(1)));

        when(genreRepository.findByNameIgnoreCase(any())).thenReturn(Optional.empty());
        when(genreRepository.save(any()))
                .thenReturn(genres.get(0))
                .thenReturn(genres.get(1));

        MediaItem item = processor.process(csv);

        assertEquals(new HashSet<>(platforms),
                item.getPlatforms());
        assertEquals(new HashSet<>(genres),
                item.getGenres());
        assertEquals("Inception", item.getName());
        assertEquals(2010, item.getYear());
        assertEquals(Category.MOVIE, item.getCategory());
    }

    @Test
    void shouldSkipInvalidYear() {
        MediaItemCSV csv = new MediaItemCSV(
                "MOVIE", "Test", "abcd", "Drama", "Netflix"
        );

        assertThatThrownBy(() -> processor.process(csv))
                .isInstanceOf(SkippableItemException.class)
                .hasMessageContaining("Invalid year");
    }

    @Test
    void shouldSkipOutOfRangeYear_maximum() {
        MediaItemCSV csv = new MediaItemCSV(
                "MOVIE", "Test", "3001", "Drama", "Netflix"
        );

        assertThatThrownBy(() -> processor.process(csv))
                .isInstanceOf(SkippableItemException.class)
                .hasMessageContaining("Year out of range");
    }

    @Test
    void shouldSkipOutOfRangeYear_minimum() {
        MediaItemCSV csv = new MediaItemCSV(
                "MOVIE", "Test", "1800", "Drama", "Netflix"
        );

        assertThatThrownBy(() -> processor.process(csv))
                .isInstanceOf(SkippableItemException.class)
                .hasMessageContaining("Year out of range");
    }

    @Test
    void shouldSkipInvalidName() {
        MediaItemCSV csv = new MediaItemCSV(
                "MOVIE", "   ", "2020", "Drama", "Netflix"
        );

        assertThatThrownBy(() -> processor.process(csv))
                .isInstanceOf(SkippableItemException.class)
                .hasMessageContaining("Name is mandatory");
    }

    @Test
    void shouldSkipInvalidCategory() {
        MediaItemCSV csv = new MediaItemCSV(
                "INVALID", "Test", "2020", "Drama", "Netflix"
        );

        assertThatThrownBy(() -> processor.process(csv))
                .isInstanceOf(SkippableItemException.class)
                .hasMessageContaining("Invalid category");
    }
}

