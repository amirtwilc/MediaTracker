package com.amir.mediatracker.service;

import com.amir.mediatracker.dto.request.FollowRequest;
import com.amir.mediatracker.dto.response.UserFollowResponse;
import com.amir.mediatracker.entity.User;
import com.amir.mediatracker.entity.UserFollow;
import com.amir.mediatracker.exception.BadRequestException;
import com.amir.mediatracker.exception.DuplicateResourceException;
import com.amir.mediatracker.exception.ResourceNotFoundException;
import com.amir.mediatracker.repository.UserFollowRepository;
import com.amir.mediatracker.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.AssertionsForInterfaceTypes.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class FollowServiceTest {

    @Mock
    UserRepository userRepository;

    @Mock
    UserFollowRepository userFollowRepository;

    @InjectMocks
    FollowService followService;

    @Test
    void updateThreshold_notFound() {
        when(userFollowRepository.findByFollowerIdAndFollowingId(anyLong(), anyLong()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                followService.updateThreshold(1L, 2L, (short) 7)
        ).isInstanceOf(ResourceNotFoundException.class);
    }


    @Test
    void updateThreshold_success() {
        UserFollow follow = new UserFollow();
        follow.setMinimumRatingThreshold((short) 5);
        follow.setFollowing(User.builder().id(2L).showEmail(false).build());

        when(userFollowRepository.findByFollowerIdAndFollowingId(1L, 2L))
                .thenReturn(Optional.of(follow));
        when(userFollowRepository.save(any())).thenReturn(follow);

        UserFollowResponse response =
                followService.updateThreshold(1L, 2L, (short) 9);

        assertThat(response.getMinimumRatingThreshold()).isEqualTo((short) 9);
    }


    @Test
    void unfollowUser_notExisting_noException() {
        when(userFollowRepository.findByFollowerIdAndFollowingId(anyLong(), anyLong()))
                .thenReturn(Optional.empty());

        followService.unfollowUser(2L, 1L);

        verify(userFollowRepository, never()).delete(any());
    }


    @Test
    void unfollowUser_success() {
        UserFollow follow = new UserFollow();

        when(userFollowRepository.findByFollowerIdAndFollowingId(1L, 2L))
                .thenReturn(Optional.of(follow));

        followService.unfollowUser(2L, 1L);

        verify(userFollowRepository).delete(follow);
    }


    @Test
    void followUser_raceCondition_throwsDuplicate() {
        when(userRepository.findById(anyLong())).thenReturn(Optional.of(new User()));
        when(userFollowRepository.existsByFollowerIdAndFollowingId(anyLong(), anyLong()))
                .thenReturn(false);

        when(userFollowRepository.saveAndFlush(any()))
                .thenThrow(new DataIntegrityViolationException("unique constraint"));

        FollowRequest request = new FollowRequest();
        request.setUserId(2L);

        assertThatThrownBy(() ->
                followService.followUser(1L, request)
        ).isInstanceOf(DuplicateResourceException.class);
    }

    @Test
    void followUser_alreadyFollowing_throwsDuplicate() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(new User()));
        when(userRepository.findById(2L)).thenReturn(Optional.of(new User()));
        when(userFollowRepository.existsByFollowerIdAndFollowingId(1L, 2L))
                .thenReturn(true);

        FollowRequest request = new FollowRequest();
        request.setUserId(2L);

        assertThatThrownBy(() ->
                followService.followUser(1L, request)
        ).isInstanceOf(DuplicateResourceException.class);
    }

    @Test
    void followUser_selfFollow_throwsBadRequest() {
        FollowRequest request = new FollowRequest();
        request.setUserId(1L);

        assertThatThrownBy(() ->
                followService.followUser(1L, request)
        ).isInstanceOf(BadRequestException.class);
    }

    @Test
    void followUser_success() {
        Long followerId = 1L;
        Long followingId = 2L;

        User follower = new User();
        follower.setId(followerId);

        User following = new User();
        following.setId(followingId);

        FollowRequest request = new FollowRequest();
        request.setUserId(followingId);
        request.setMinimumRatingThreshold((short) 8);

        when(userRepository.findById(followerId)).thenReturn(Optional.of(follower));
        when(userRepository.findById(followingId)).thenReturn(Optional.of(following));
        when(userFollowRepository.existsByFollowerIdAndFollowingId(followerId, followingId))
                .thenReturn(false);

        UserFollow saved = new UserFollow();
        saved.setId(10L);
        saved.setFollower(follower);
        saved.setFollowing(following);
        saved.setMinimumRatingThreshold((short) 8);

        when(userFollowRepository.saveAndFlush(any())).thenReturn(saved);

        UserFollowResponse response = followService.followUser(followerId, request);

        assertThat(response.getId()).isEqualTo(10L);
        assertThat(response.getMinimumRatingThreshold()).isEqualTo((short) 8);
    }

}
