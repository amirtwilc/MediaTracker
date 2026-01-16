package com.amir.mediatracker.service;

import com.amir.mediatracker.dto.Category;
import com.amir.mediatracker.dto.response.MediaItemResponse;
import com.amir.mediatracker.dto.response.MediaSearchResponse;
import com.amir.mediatracker.entity.Genre;
import com.amir.mediatracker.entity.MediaItem;
import com.amir.mediatracker.entity.Platform;
import com.amir.mediatracker.entity.UserMediaList;
import com.amir.mediatracker.repository.MediaItemRepository;
import com.amir.mediatracker.repository.UserMediaListRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.AssertionsForInterfaceTypes.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MediaItemServiceTest {

    @InjectMocks
    private MediaItemService mediaItemService;

    @Mock
    private MediaItemRepository mediaItemRepository;

    @Mock
    private UserMediaListRepository userMediaListRepository;

    private MediaItem item1;
    private MediaItem item2;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(mediaItemService, "maxLimit", 10);
        item1 = MediaItem.builder()
                .id(1L)
                .name("Matrix")
                .category(Category.MOVIE)
                .genres(Set.of(new Genre(1L, "Action", LocalDateTime.now())))
                .platforms(Set.of(new Platform(1L, "Netflix", LocalDateTime.now())))
                .build();

        item2 = MediaItem.builder()
                .id(2L)
                .name("Matrix Reloaded")
                .category(Category.MOVIE)
                .genres(Set.of(new Genre(1L, "Action", LocalDateTime.now())))
                .platforms(Set.of(new Platform(1L, "Netflix", LocalDateTime.now())))
                .build();
    }

    @Test
    void searchMediaItemsCursor_simpleSearch_shouldReturnItemsAndNoCursor() {
        when(mediaItemRepository.countSimple(any(), any()))
                .thenReturn(2L);

        when(mediaItemRepository.searchWithCursorAndFilters(
                any(), any(), any(), any(),
                anyLong(), anyLong(),
                any(), any(),
                any(Pageable.class)
        )).thenReturn(List.of(item1, item2));

        when(userMediaListRepository.findByUserIdAndMediaItemIdIn(any(), any()))
                .thenReturn(List.of());

        MediaSearchResponse response = mediaItemService.searchMediaItemsCursor(
                1L,
                "Matrix",
                Set.of(Category.MOVIE),
                null,
                null,
                null,
                null,
                10
        );

        assertThat(response.getItems()).hasSize(2);
        assertThat(response.isHasMore()).isFalse();
        assertThat(response.getNextCursor()).isNull();
        assertThat(response.getTotalCount()).isEqualTo(2);
    }

    @Test
    void searchMediaItemsCursor_withPagination_shouldReturnHasMoreAndCursor() {
        when(mediaItemRepository.countSimple(any(), any()))
                .thenReturn(2L);

        when(mediaItemRepository.searchWithCursorAndFilters(
                any(), any(), any(), any(),
                anyLong(), anyLong(),
                any(), any(),
                any(Pageable.class)
        )).thenReturn(List.of(item1, item2)); // limit=1 → returns 2

        when(userMediaListRepository.findByUserIdAndMediaItemIdIn(any(), any()))
                .thenReturn(List.of());

        MediaSearchResponse response = mediaItemService.searchMediaItemsCursor(
                1L,
                "Matrix",
                null,
                null,
                null,
                null,
                null,
                1
        );

        assertThat(response.getItems()).hasSize(1);
        assertThat(response.isHasMore()).isTrue();
        assertThat(response.getNextCursor()).isNotNull();
        assertThat(response.getNextCursor().getName()).isEqualTo("Matrix");
    }

    @Test
    void searchMediaItemsCursor_shouldMarkItemsInUserList() {
        when(mediaItemRepository.countSimple(any(), any()))
                .thenReturn(2L);

        when(mediaItemRepository.searchWithCursorAndFilters(
                any(), any(), any(), any(),
                anyLong(), anyLong(),
                any(), any(),
                any(Pageable.class)
        )).thenReturn(List.of(item1, item2));

        UserMediaList uml = new UserMediaList();
        uml.setMediaItem(item1);

        when(userMediaListRepository.findByUserIdAndMediaItemIdIn(
                eq(1L), any()
        )).thenReturn(List.of(uml));

        MediaSearchResponse response = mediaItemService.searchMediaItemsCursor(
                1L,
                "Matrix",
                null,
                null,
                null,
                null,
                null,
                10
        );

        assertThat(response.getItems())
                .filteredOn(MediaItemResponse::getInUserList)
                .hasSize(1);
    }

    @Test
    void searchMediaItemsCursor_withGenreOnlyFilter_shouldUseCountWithFilters() {
        when(mediaItemRepository.countWithFilters(
                any(), any(), any(), any(),
                anyLong(), anyLong()
        )).thenReturn(1L);

        when(mediaItemRepository.searchWithCursorAndFilters(
                any(), any(), any(), any(),
                anyLong(), anyLong(),
                any(), any(),
                any(Pageable.class)
        )).thenReturn(List.of(item1));

        MediaSearchResponse response = mediaItemService.searchMediaItemsCursor(
                1L,
                "Matrix",
                null,
                Set.of(1L),
                null,
                null,
                null,
                10
        );

        assertThat(response.getItems()).hasSize(1);
        assertThat(response.getTotalCount()).isEqualTo(1);
    }

    @Test
    void searchMediaItemsCursor_withPlatformOnlyFilter_shouldUseCountWithFilters() {
        when(mediaItemRepository.countWithFilters(
                any(), any(), any(), any(),
                anyLong(), anyLong()
        )).thenReturn(1L);

        when(mediaItemRepository.searchWithCursorAndFilters(
                any(), any(), any(), any(),
                anyLong(), anyLong(),
                any(), any(),
                any(Pageable.class)
        )).thenReturn(List.of(item1));

        MediaSearchResponse response = mediaItemService.searchMediaItemsCursor(
                1L,
                "Matrix",
                null,
                null,
                Set.of(2L),
                null,
                null,
                10
        );

        assertThat(response.getItems()).hasSize(1);
        assertThat(response.getTotalCount()).isEqualTo(1);
    }

    @Test
    void searchMediaItemsCursor_withGenreAndPlatformFilters_shouldUseCountWithFilters() {
        when(mediaItemRepository.countWithFilters(
                any(), any(), any(), any(),
                anyLong(), anyLong()
        )).thenReturn(1L);

        when(mediaItemRepository.searchWithCursorAndFilters(
                any(), any(), any(), any(),
                anyLong(), anyLong(),
                any(), any(),
                any(Pageable.class)
        )).thenReturn(List.of(item1));

        MediaSearchResponse response = mediaItemService.searchMediaItemsCursor(
                1L,
                "Matrix",
                null,
                Set.of(1L),
                Set.of(2L),
                null,
                null,
                10
        );

        assertThat(response.getItems()).hasSize(1);
        assertThat(response.getTotalCount()).isEqualTo(1);
    }
}

