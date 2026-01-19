package com.amir.mediatracker.service;

import com.amir.mediatracker.dto.ItemRatingCriteria;
import com.amir.mediatracker.dto.UserSortBy;
import com.amir.mediatracker.dto.request.AdvancedUserSearchRequest;
import com.amir.mediatracker.dto.response.UserProfileResponse;
import com.amir.mediatracker.entity.User;
import com.amir.mediatracker.entity.UserProfileStats;
import com.amir.mediatracker.exception.BadRequestException;
import com.amir.mediatracker.exception.ResourceNotFoundException;
import com.amir.mediatracker.repository.UserRepository;
import org.hibernate.query.SortDirection;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.AssertionsForInterfaceTypes.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserSearchServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserSearchService userSearchService;

    @BeforeEach
    void setup() {
        ReflectionTestUtils.setField(userSearchService, "advancedSearchMaxCriteria", 1);
    }

    @Test
    void advancedSearch_throwIfCriteriaToBig() {
        assertThrows(BadRequestException.class,
                () -> userSearchService.advancedSearch(1L, new AdvancedUserSearchRequest(
                        List.of(new ItemRatingCriteria(1L, 1, 10),
                                new ItemRatingCriteria(2L, 1, 10)),
                        UserSortBy.LAST_ACTIVE,
                        SortDirection.DESCENDING,
                        0,
                        20
                )));
    }

    @Test
    void getUserProfile_shouldReturnProfile() {
        User user = new User();
        user.setId(10L);
        user.setUsername("john");
        user.setEmail("john@test.com");
        user.setShowEmail(true);
        user.setIsInvisible(false);

        when(userRepository.findById(10L)).thenReturn(Optional.of(user));
        when(userRepository.fetchUserProfileStats(10L, 20L))
                .thenReturn(new UserProfileStats(5L, 7L, true));

        UserProfileResponse response =
                userSearchService.getUserProfile(10L, 20L);

        assertThat(response.getRatingsCount()).isEqualTo(5);
        assertThat(response.getFollowersCount()).isEqualTo(7);
        assertThat(response.getIsFollowing()).isTrue();
        assertThat(response.getEmail()).isEqualTo("john@test.com");
    }

    @Test
    void getUserProfile_shouldThrow_whenUserNotFound() {
        when(userRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                userSearchService.getUserProfile(1L, 2L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getUserProfile_shouldThrow_whenInvisible() {
        User user = new User();
        user.setIsInvisible(true);

        when(userRepository.findById(anyLong())).thenReturn(Optional.of(user));

        assertThatThrownBy(() ->
                userSearchService.getUserProfile(1L, 2L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("private");
    }
}
