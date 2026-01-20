package com.amir.mediatracker.service;

import com.amir.mediatracker.dto.response.UserMediaListSearchResponse;
import com.amir.mediatracker.entity.MediaItem;
import com.amir.mediatracker.entity.User;
import com.amir.mediatracker.entity.UserMediaList;
import com.amir.mediatracker.exception.ForbiddenException;
import com.amir.mediatracker.repository.UserMediaListRepository;
import com.amir.mediatracker.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.AssertionsForInterfaceTypes.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserMediaListServiceTest {

    @Mock
    private UserMediaListRepository userMediaListRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserMediaListService userMediaListService;

    @BeforeEach
    void setup() {
        ReflectionTestUtils.setField(userMediaListService, "maxLimit", 50);
    }

    @Test
    void throwsWhenUserIsInvisible() {
        User invisibleUser = new User();
        invisibleUser.setIsInvisible(true);

        when(userRepository.findById(2L))
                .thenReturn(Optional.of(invisibleUser));

        assertThatThrownBy(() ->
                userMediaListService.getUserMediaListCursor(
                        2L, 1L, null, null, null, null,
                        false, null, null, 20))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void appliesWishToExperienceFilter() {
        when(userMediaListRepository.countByUserIdWithFilters(
                any(), any(), any(), any(), any(), anyLong(), anyLong(), eq(true)))
                .thenReturn(2L);

        when(userMediaListRepository.findByUserIdWithFilters(
                any(), any(), any(), any(), any(),
                anyLong(), anyLong(), eq(true),
                any(), anyLong(), any()))
                .thenReturn(List.of(mockUserMediaList()));

        UserMediaListSearchResponse response =
                userMediaListService.getUserMediaListCursor(
                        null, 1L, null, null, null, null,
                        true, null, null, 20
                );

        assertThat(response.getTotalCount()).isEqualTo(2);
    }

    @Test
    void respectsCursorNameAndId() {
        when(userMediaListRepository.countByUserIdWithFilters(any(), any(), any(), any(), any(), anyLong(), anyLong(), anyBoolean()))
                .thenReturn(1L);

        when(userMediaListRepository.findByUserIdWithFilters(
                any(), any(), any(), any(), any(),
                anyLong(), anyLong(), anyBoolean(),
                eq("Matrix"), eq(10L), any()))
                .thenReturn(List.of(mockUserMediaList()));

        UserMediaListSearchResponse response =
                userMediaListService.getUserMediaListCursor(
                        null, 1L, null, null, null, null,
                        false, "Matrix", 10L, 20
                );

        assertThat(response.getItems()).hasSize(1);
    }

    @Test
    void clampsLimitToRange() {
        when(userMediaListRepository.countByUserIdWithFilters(any(), any(), any(), any(), any(), anyLong(), anyLong(), anyBoolean()))
                .thenReturn(0L);

        when(userMediaListRepository.findByUserIdWithFilters(any(), any(), any(), any(), any(), anyLong(), anyLong(),
                anyBoolean(), any(), anyLong(), any()))
                .thenReturn(List.of());

        userMediaListService.getUserMediaListCursor(null, 1L, null, null, null, null,
                false, null, null, -10);

        userMediaListService.getUserMediaListCursor(null, 1L, null, null, null, null,
                false, null, null, 10_000);

        verify(userMediaListRepository, times(2))
                .findByUserIdWithFilters(any(), any(), any(), any(), any(), anyLong(), anyLong(),
                        anyBoolean(), any(), anyLong(), argThat(p -> p.getPageSize() <= 51));
    }

    @Test
    void returnsItems_withDefaultLimit_andHasMore() {
        Long userId = 1L;

        List<UserMediaList> items = IntStream.range(0, 21)
                .mapToObj(i -> mockUserMediaList())
                .toList();

        when(userMediaListRepository.countByUserIdWithFilters(
                eq(userId), any(), any(), any(), any(), anyLong(), anyLong(), eq(false)))
                .thenReturn(100L);

        when(userMediaListRepository.findByUserIdWithFilters(
                eq(userId), any(), any(), any(), any(),
                anyLong(), anyLong(), eq(false),
                any(), anyLong(), any()))
                .thenReturn(items);

        UserMediaListSearchResponse response =
                userMediaListService.getUserMediaListCursor(
                        userId, userId, null, null, null, null,
                        false, null, null, 20
                );

        assertThat(response.getItems()).hasSize(20);
        assertThat(response.isHasMore()).isTrue();
        assertThat(response.getNextCursor()).isNotNull();
    }

    private UserMediaList mockUserMediaList() {
        UserMediaList uml = new UserMediaList();
        uml.setMediaItem(new MediaItem());
        return uml;
    }
}

