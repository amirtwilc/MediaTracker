package com.amir.mediatracker.service;

import com.amir.mediatracker.dto.request.FollowRequest;
import com.amir.mediatracker.dto.response.UserFollowResponse;
import com.amir.mediatracker.dto.response.UserResponse;
import com.amir.mediatracker.entity.User;
import com.amir.mediatracker.entity.UserFollow;
import com.amir.mediatracker.exception.BadRequestException;
import com.amir.mediatracker.exception.DuplicateResourceException;
import com.amir.mediatracker.exception.ResourceNotFoundException;
import com.amir.mediatracker.repository.UserFollowRepository;
import com.amir.mediatracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FollowService {

    private final UserFollowRepository userFollowRepository;
    private final UserRepository userRepository;

    @Transactional
    public UserFollowResponse followUser(Long userId, FollowRequest request) {
        if (userId.equals(request.getUserId())) {
            throw new BadRequestException("You cannot follow yourself");
        }

        User follower = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Follower not found"));

        User following = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User to follow not found"));

        if (userFollowRepository.existsByFollowerIdAndFollowingId(userId, request.getUserId())) {
            throw new DuplicateResourceException("You are already following this user");
        }

        UserFollow follow = new UserFollow();
        follow.setFollower(follower);
        follow.setFollowing(following);
        follow.setMinimumRatingThreshold(request.getMinimumRatingThreshold());

        try {
            UserFollow saved = userFollowRepository.saveAndFlush(follow);
            log.info("User {} started following user {} with threshold {}",
                    userId, request.getUserId(), request.getMinimumRatingThreshold());
            return mapToResponse(saved);
        } catch (DataIntegrityViolationException e) {
            throw new DuplicateResourceException("You are already following this user");
        }
    }

    @Transactional
    public void unfollowUser(Long followingId, Long userId) {
        userFollowRepository
                .findByFollowerIdAndFollowingId(userId, followingId)
                .ifPresent(follow -> {
                    userFollowRepository.delete(follow);
                    log.info("User {} unfollowed user {}", userId, followingId);
                });
    }

    @Transactional
    public UserFollowResponse updateThreshold(Long followerId, Long followingId, Short threshold) {
        UserFollow follow = userFollowRepository
                .findByFollowerIdAndFollowingId(followerId, followingId)
                .orElseThrow(() -> new ResourceNotFoundException("Follow relationship not found"));

        follow.setMinimumRatingThreshold(threshold);
        UserFollow saved = userFollowRepository.save(follow);

        log.info("User {} updated threshold for user {} to {}",
                followerId, followingId, threshold);

        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<UserFollowResponse> getFollowing(Long userId) {
        List<UserFollow> following = userFollowRepository.findByFollowerId(userId);
        return following.stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getFollowers(Long userId) {
        List<UserFollow> followers = userFollowRepository.findByFollowingId(userId);
        return followers.stream()
                .map(f -> mapUserToResponse(f.getFollower()))
                .toList();
    }

    private UserFollowResponse mapToResponse(UserFollow follow) {
        return UserFollowResponse.builder()
                .id(follow.getId())
                .user(mapUserToResponse(follow.getFollowing()))
                .minimumRatingThreshold(follow.getMinimumRatingThreshold())
                .createdAt(follow.getCreatedAt())
                .build();
    }

    private UserResponse mapUserToResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getShowEmail() ? user.getEmail() : null)
                .role(user.getRole())
                .build();
    }
}
