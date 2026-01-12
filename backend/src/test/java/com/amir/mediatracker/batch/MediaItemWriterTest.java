package com.amir.mediatracker.batch;

import com.amir.mediatracker.batch.writer.MediaItemWriter;
import com.amir.mediatracker.dto.Category;
import com.amir.mediatracker.entity.MediaItem;
import com.amir.mediatracker.repository.MediaItemRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.batch.item.Chunk;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MediaItemWriterTest {

    @Captor
    ArgumentCaptor<MediaItem> mediaItemCaptor;

    @Mock
    MediaItemRepository repository;

    @InjectMocks
    MediaItemWriter writer;

    @Test
    void shouldInsertNewItem() {
        MediaItem item = MediaItem.builder()
                .name("Inception")
                .category(Category.MOVIE)
                .build();

        when(repository.findAllByNameIn(any()))
                .thenReturn(List.of());

        writer.write(Chunk.of(item));

        verify(repository).save(mediaItemCaptor.capture());
        assertThat(mediaItemCaptor.getValue().getName()).isEqualTo("Inception");
    }

    @Test
    void shouldUpdateItem() {
        MediaItem newItem = MediaItem.builder()
                .name("Inception")
                .year(2000)
                .category(Category.MOVIE)
                .build();

        MediaItem existingItem = MediaItem.builder()
                .name("Inception")
                .year(1900)
                .category(Category.MOVIE)
                .build();

        when(repository.findAllByNameIn(any()))
                .thenReturn(List.of(existingItem));

        writer.write(Chunk.of(newItem));

        verify(repository).save(mediaItemCaptor.capture());
        assertThat(mediaItemCaptor.getValue().getYear()).isEqualTo(2000);
    }
}
