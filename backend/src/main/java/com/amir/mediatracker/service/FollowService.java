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
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
public class FollowService {

    @Autowired
    private UserFollowRepository userFollowRepository;

    @Autowired
    private UserRepository userRepository;

    @Transactional
    public UserFollowResponse followUser(Long userId, FollowRequest request) {
        if (userId.equals(request.getUserId())) {
            throw new BadRequestException("You cannot follow yourself");
        }

        User follower = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Follower not found"));

        User following = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User to follow not found"));

        // Check if already following
        if (userFollowRepository.existsByFollowerIdAndFollowingId(userId, request.getUserId())) {
            throw new DuplicateResourceException("You are already following this user");
        }

        UserFollow follow = new UserFollow();
        follow.setFollower(follower);
        follow.setFollowing(following);
        follow.setMinimumRatingThreshold(request.getMinimumRatingThreshold());

        UserFollow saved = userFollowRepository.save(follow);
        log.info("User {} started following user {} with threshold {}",
                userId, request.getUserId(), request.getMinimumRatingThreshold());

        return mapToResponse(saved);
    }

    @Transactional
    public void unfollowUser(Long followingId, Long userId) {
        UserFollow follow = userFollowRepository
                .findByFollowerIdAndFollowingId(userId, followingId)
                .orElseThrow(() -> new ResourceNotFoundException("Follow relationship not found"));

        userFollowRepository.delete(follow);
        log.info("User {} unfollowed user {}", userId, followingId);
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

    @Transactional //for LAZY
    public List<UserFollowResponse> getFollowing(Long userId) {
        List<UserFollow> following = userFollowRepository.findByFollowerId(userId);
        return following.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional //for LAZY
    public List<UserResponse> getFollowers(Long userId) {
        List<UserFollow> followers = userFollowRepository.findByFollowingId(userId);
        return followers.stream()
                .map(f -> mapUserToResponse(f.getFollower()))
                .collect(Collectors.toList());
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
                .email(user.getEmail())
                .role(user.getRole())
                .build();
    }
}
