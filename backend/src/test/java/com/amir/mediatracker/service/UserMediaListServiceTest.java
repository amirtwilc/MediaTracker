package com.amir.mediatracker.service;

import com.amir.mediatracker.dto.Category;
import com.amir.mediatracker.dto.SortDirection;
import com.amir.mediatracker.dto.UserSearchMediaSortBy;
import com.amir.mediatracker.dto.request.UpdateMediaListRequest;
import com.amir.mediatracker.dto.response.UserMediaListResponse;
import com.amir.mediatracker.dto.response.UserMediaListSearchResponse;
import com.amir.mediatracker.entity.*;
import com.amir.mediatracker.exception.DuplicateResourceException;
import com.amir.mediatracker.exception.ForbiddenException;
import com.amir.mediatracker.exception.ResourceNotFoundException;
import com.amir.mediatracker.kafka.event.RatingEvent;
import com.amir.mediatracker.repository.MediaItemRepository;
import com.amir.mediatracker.repository.UserMediaListRepository;
import com.amir.mediatracker.repository.UserRepository;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.*;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.AssertionsForInterfaceTypes.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserMediaListServiceTest {


    @Captor
    ArgumentCaptor<Pageable> pageableCaptor;
    @Captor
    ArgumentCaptor<UserMediaList> umlCaptor;

    @Mock
    private UserMediaListRepository userMediaListRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private MediaItemRepository mediaItemRepository;
    @Mock
    ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private UserMediaListService userMediaListService;

    @BeforeEach
    void setup() {
        ReflectionTestUtils.setField(userMediaListService, "maxLimit", 50);
    }

    @Test
    void updateMediaListItem_VerifyFieldsWhenExperiencedIsFalse() {
        UserMediaList uml = UserMediaList.builder()
                .mediaItem(new MediaItem())
                .user(new User())
                .experienced(true)
                .wishToReexperience(true)
                .comment(null)
                .rating((short) 10)
                .build();

        when(userMediaListRepository.findByIdAndUserId(any(), any()))
                .thenReturn(Optional.of(uml));
        when(userMediaListRepository.save(any())).thenReturn(uml);

        UpdateMediaListRequest request = new UpdateMediaListRequest();
        request.setExperienced(false);
        request.setWishToReexperience(true);
        request.setComment("comment");
        request.setRating((short) 10);

        userMediaListService.updateMediaListItem(10L, request);

        verify(userMediaListRepository).save(umlCaptor.capture());
        uml = umlCaptor.getValue();
        assertFalse(uml.getExperienced());
        assertFalse(uml.getWishToReexperience());
        assertFalse(uml.getComment().isBlank());
        assertNull(uml.getRating());
    }

    @Test
    void updateMediaListItem_VerifyFieldsWhenNotNull() {
        UserMediaList uml = UserMediaList.builder()
                .mediaItem(new MediaItem())
                .user(new User())
                .experienced(null)
                .wishToReexperience(null)
                .comment(null)
                .rating(null)
                .build();

        when(userMediaListRepository.findByIdAndUserId(any(), any()))
                .thenReturn(Optional.of(uml));
        when(userMediaListRepository.save(any())).thenReturn(uml);

        UpdateMediaListRequest request = new UpdateMediaListRequest();
        request.setExperienced(true);
        request.setWishToReexperience(true);
        request.setComment("comment");
        request.setRating((short) 10);

        userMediaListService.updateMediaListItem(10L, request);

        verify(userMediaListRepository).save(umlCaptor.capture());
        uml = umlCaptor.getValue();
        assertTrue(uml.getExperienced());
        assertTrue(uml.getWishToReexperience());
        assertFalse(uml.getComment().isBlank());
        assertEquals((short) 10, uml.getRating());
    }

    @Test
    void updateMediaListItem_throwResourceNotFound() {
        UserMediaList uml = UserMediaList.builder()
                .mediaItem(new MediaItem())
                .user(new User())
                .experienced(true)
                .rating((short) 2)
                .build();

        when(userMediaListRepository.findByIdAndUserId(any(), any()))
                .thenReturn(Optional.empty());

        UpdateMediaListRequest request = new UpdateMediaListRequest();

        assertThrows(ResourceNotFoundException.class,
                () -> userMediaListService.updateMediaListItem(10L, request));
    }

    @Test
    void updateMediaListItem_publishRatingEvent_whenRatingWasDifferent() {
        UserMediaList uml = UserMediaList.builder()
                .mediaItem(new MediaItem())
                .user(new User())
                .experienced(true)
                .rating((short) 2)
                .build();

        when(userMediaListRepository.findByIdAndUserId(1L, 10L))
                .thenReturn(Optional.of(uml));
        when(userMediaListRepository.save(any())).thenReturn(uml);

        UpdateMediaListRequest request = new UpdateMediaListRequest();
        request.setId(1L);
        request.setRating((short) 5);

        userMediaListService.updateMediaListItem(10L, request);

        verify(eventPublisher).publishEvent(any(RatingEvent.class));
    }

    @Test
    void updateMediaListItem_publishRatingEvent_whenRatingWasNull() {
        UserMediaList uml = UserMediaList.builder()
                .mediaItem(new MediaItem())
                .user(new User())
                .experienced(true)
                .rating(null)
                .build();

        when(userMediaListRepository.findByIdAndUserId(1L, 10L))
                .thenReturn(Optional.of(uml));
        when(userMediaListRepository.save(any())).thenReturn(uml);

        UpdateMediaListRequest request = new UpdateMediaListRequest();
        request.setId(1L);
        request.setRating((short) 5);

        userMediaListService.updateMediaListItem(10L, request);

        verify(eventPublisher).publishEvent(any(RatingEvent.class));
    }

    @Test
    void updateMediaListItem_doesNotPublishEvent_whenRatingIsDifferentButExperiencedIsFalse() {
        UserMediaList uml = UserMediaList.builder()
                .mediaItem(new MediaItem())
                .user(new User())
                .experienced(false)
                .rating(null)
                .build();

        when(userMediaListRepository.findByIdAndUserId(any(), any()))
                .thenReturn(Optional.of(uml));
        when(userMediaListRepository.save(any())).thenReturn(uml);

        UpdateMediaListRequest request = new UpdateMediaListRequest();
        request.setId(1L);
        request.setRating((short) 6);

        userMediaListService.updateMediaListItem(10L, request);

        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void updateMediaListItem_doesNotPublishEvent_whenRatingIsNull() {
        UserMediaList uml = UserMediaList.builder()
                .mediaItem(new MediaItem())
                .user(new User())
                .experienced(true)
                .rating((short) 4)
                .build();

        when(userMediaListRepository.findByIdAndUserId(any(), any()))
                .thenReturn(Optional.of(uml));
        when(userMediaListRepository.save(any())).thenReturn(uml);

        UpdateMediaListRequest request = new UpdateMediaListRequest();
        request.setId(1L);
        request.setRating(null);

        userMediaListService.updateMediaListItem(10L, request);

        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void updateMediaListItem_doesNotPublishEvent_whenRatingIsSame() {
        UserMediaList uml = UserMediaList.builder()
                .mediaItem(new MediaItem())
                .user(new User())
                .experienced(true)
                .rating((short) 4)
                .build();

        when(userMediaListRepository.findByIdAndUserId(any(), any()))
                .thenReturn(Optional.of(uml));
        when(userMediaListRepository.save(any())).thenReturn(uml);

        UpdateMediaListRequest request = new UpdateMediaListRequest();
        request.setId(1L);
        request.setRating((short) 4);

        userMediaListService.updateMediaListItem(10L, request);

        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void removeMediaFromList_notFound() {
        when(userMediaListRepository.findByIdAndUserId(100L, 1L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                userMediaListService.removeMediaFromList(1L, 100L))
                .isInstanceOf(ResourceNotFoundException.class);
    }


    @Test
    void removeMediaFromList_success() {
        UserMediaList uml = mockUserMediaList();
        uml.setId(100L);

        when(userMediaListRepository.findByIdAndUserId(100L, 1L))
                .thenReturn(Optional.of(uml));

        userMediaListService.removeMediaFromList(1L, 100L);

        verify(userMediaListRepository).delete(uml);
    }



    @Test
    void addMediaToList_duplicate() {
        MediaItem mediaItem = MediaItem.builder()
                .id(10L)
                .genres(Set.of(new Genre()))
                .platforms(Set.of(new Platform()))
                .build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(User.builder().id(1L).build()));
        when(mediaItemRepository.findById(10L)).thenReturn(Optional.of(mediaItem));
        when(userMediaListRepository.save(any()))
                .thenThrow(new DataIntegrityViolationException("unique"));

        assertThatThrownBy(() ->
                userMediaListService.addMediaToList(1L, 10L))
                .isInstanceOf(DuplicateResourceException.class);
    }


    @Test
    void addMediaToList_mediaItemNotFound() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(User.builder().id(1L).build()));
        when(mediaItemRepository.findById(10L)).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                userMediaListService.addMediaToList(1L, 10L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Media item not found");
    }


    @Test
    void addMediaToList_userNotFound() {
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                userMediaListService.addMediaToList(1L, 10L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("User not found");
    }


    @Test
    void addMediaToList_success() {
        User user = User.builder().id(1L).build();
        MediaItem mediaItem = MediaItem.builder()
                .id(10L)
                .genres(Set.of(new Genre()))
                .platforms(Set.of(new Platform()))
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(mediaItemRepository.findById(10L)).thenReturn(Optional.of(mediaItem));
        when(userMediaListRepository.save(any()))
                .thenAnswer(inv -> {
                    UserMediaList uml = inv.getArgument(0);
                    uml.setId(100L);
                    return uml;
                });

        UserMediaListResponse response =
                userMediaListService.addMediaToList(1L, 10L);

        assertThat(response.getId()).isEqualTo(100L);
        assertThat(response.getMediaItem().getId()).isEqualTo(10L);
        assertThat(response.getExperienced()).isFalse();
    }


    @Test
    void getUserMediaListSorted_shouldUseGivenValuesFromRequest() {
        // Arrange
        Long userId = 1L;

        MediaItem m1 = MediaItem.builder()
                .name("Avatar")
                .genres(Set.of(new Genre()))
                .platforms(Set.of(new Platform())).build();
        MediaItem m2 = MediaItem.builder()
                .name("Matrix")
                .genres(Set.of(new Genre()))
                .platforms(Set.of(new Platform())).build();

        UserMediaList uml1 = UserMediaList.builder().id(2L).mediaItem(m1).build();
        UserMediaList uml2 = UserMediaList.builder().id(1L).mediaItem(m2).build();

        Page<UserMediaList> page = new PageImpl<>(
                List.of(uml1, uml2),
                PageRequest.of(0, 20),
                2
        );

        // Act
        when(userMediaListRepository.findByUserIdWithFiltersSorted(
                eq(userId), anyString(), any(), any(), any(),
                anyLong(), anyLong(), eq(true), any()
        )).thenReturn(page);

        Set<Category> categories = Set.of(Category.MOVIE, Category.SERIES);
        Set<Long> genres = Set.of(1L);
        Set<Long> platforms = Set.of(1L, 2L, 3L);
        userMediaListService.getUserMediaListSorted(
                        userId, userId,
                        "Interstellar", categories, genres, platforms,
                        true, 0, 20,
                        UserSearchMediaSortBy.YEAR, SortDirection.ASC
                );

        // Verify
        verify(userMediaListRepository).findByUserIdWithFiltersSorted(
                eq(userId),
                eq("Interstellar"),
                eq(categories),
                eq(genres),
                eq(platforms),
                eq(1L),
                eq(3L),
                eq(true),
                pageableCaptor.capture()
        );

        Assertions.assertThat(pageableCaptor.getValue().getSort()
                .getOrderFor("mediaItem.year").getDirection()).isEqualTo(Sort.Direction.ASC);
    }

    @Test
    void getUserMediaListSorted_shouldUseDefaultsWhenEmptyOrFalse() {
        // Arrange
        Long userId = 1L;

        MediaItem m1 = MediaItem.builder()
                .name("Avatar")
                .genres(Set.of(new Genre()))
                .platforms(Set.of(new Platform())).build();
        MediaItem m2 = MediaItem.builder()
                .name("Matrix")
                .genres(Set.of(new Genre()))
                .platforms(Set.of(new Platform())).build();

        UserMediaList uml1 = UserMediaList.builder().id(2L).mediaItem(m1).build();
        UserMediaList uml2 = UserMediaList.builder().id(1L).mediaItem(m2).build();

        Page<UserMediaList> page = new PageImpl<>(
                List.of(uml1, uml2),
                PageRequest.of(0, 20),
                2
        );

        // Act
        when(userMediaListRepository.findByUserIdWithFiltersSorted(
                eq(userId), anyString(), any(), any(), any(),
                anyLong(), anyLong(), eq(false), any()
        )).thenReturn(page);

        userMediaListService.getUserMediaListSorted(
                        userId, userId,
                        "", Set.of(), Set.of(), Set.of(),
                        false, 0, 20,
                        UserSearchMediaSortBy.EXPERIENCED, SortDirection.DESC
                );

        // Verify
        verify(userMediaListRepository).findByUserIdWithFiltersSorted(
                eq(userId),
                eq(""),
                eq(null),
                eq(null),
                eq(null),
                eq(0L),
                eq(0L),
                eq(false),
                pageableCaptor.capture()
        );

        Assertions.assertThat(pageableCaptor.getValue().getSort()
                .getOrderFor("experienced").getDirection()).isEqualTo(Sort.Direction.DESC);
    }

    @Test
    void getUserMediaListSorted_shouldUseDefaultsWhenRequestAreNull() {
        // Arrange
        Long userId = 1L;

        MediaItem m1 = MediaItem.builder()
                .name("Avatar")
                .genres(Set.of(new Genre()))
                .platforms(Set.of(new Platform())).build();
        MediaItem m2 = MediaItem.builder()
                .name("Matrix")
                .genres(Set.of(new Genre()))
                .platforms(Set.of(new Platform())).build();

        UserMediaList uml1 = UserMediaList.builder().id(2L).mediaItem(m1).build();
        UserMediaList uml2 = UserMediaList.builder().id(1L).mediaItem(m2).build();

        Page<UserMediaList> page = new PageImpl<>(
                List.of(uml1, uml2),
                PageRequest.of(0, 20),
                2
        );

        // Act
        when(userMediaListRepository.findByUserIdWithFiltersSorted(
                eq(userId), anyString(), any(), any(), any(),
                anyLong(), anyLong(), eq(false), any()
        )).thenReturn(page);

        Page<UserMediaListResponse> result =
                userMediaListService.getUserMediaListSorted(
                        userId, userId,
                        null, null, null, null,
                        null, 0, 20,
                        null, null
                );

        // Verify
        verify(userMediaListRepository).findByUserIdWithFiltersSorted(
                eq(userId),
                eq(""),
                eq(null),
                eq(null),
                eq(null),
                eq(0L),
                eq(0L),
                eq(false),
                pageableCaptor.capture()
        );

        Assertions.assertThat(pageableCaptor.getValue().getSort()
                .getOrderFor("mediaItem.name").getDirection()).isEqualTo(Sort.Direction.ASC);

        assertThat(result.getTotalElements()).isEqualTo(2);
        assertThat(result.getContent())
                .extracting(r -> r.getMediaItem().getName())
                .containsExactly("Avatar", "Matrix");
    }

    @Test
    void getUserMediaListCursor_throwsNoFoundWhenUserIsMissing() {
        when(userRepository.isUserInvisible(2L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                userMediaListService.getUserMediaListCursor(
                        2L, 1L, null, null, null, null,
                        false, null, null, 20))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getUserMediaListCursor_throwsForbiddenWhenUserIsInvisible() {
        when(userRepository.isUserInvisible(2L))
                .thenReturn(Optional.of(true));

        assertThatThrownBy(() ->
                userMediaListService.getUserMediaListCursor(
                        2L, 1L, null, null, null, null,
                        false, null, null, 20))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void getUserMediaListCursor_appliesWishToExperienceFilter() {
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
    void getUserMediaListCursor_respectsCursorNameAndId() {
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
    void getUserMediaListCursor_clampsLimitToRange() {
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
    void getUserMediaListCursor_returnsItems_withDefaultLimit_andHasMore() {
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

