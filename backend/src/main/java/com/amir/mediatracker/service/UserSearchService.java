package com.amir.mediatracker.service;

import com.amir.mediatracker.dto.Role;
import com.amir.mediatracker.dto.request.UserSearchRequest;
import com.amir.mediatracker.dto.response.UserProfileResponse;
import com.amir.mediatracker.entity.User;
import com.amir.mediatracker.repository.UserFollowRepository;
import com.amir.mediatracker.repository.UserMediaListRepository;
import com.amir.mediatracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class UserSearchService {

    private final UserRepository userRepository;
    private final UserMediaListRepository userMediaListRepository;
    private final UserFollowRepository userFollowRepository;

    @Transactional(readOnly = true)
    public Page<UserProfileResponse> searchUsers(UserSearchRequest request, Long currentUserId,
                                                 int page, int size) {
        // Get all visible users
        List<User> users;

        if (request.getUsername() != null && !request.getUsername().trim().isEmpty()) {
            users = userRepository.findByIsInvisibleFalseAndUsernameContainingIgnoreCase(
                    request.getUsername().trim());
        } else {
            users = userRepository.findByIsInvisibleFalse();
        }

        // Filter by admin
        if (request.getAdminOnly() != null) {
            Role targetRole = request.getAdminOnly() ? Role.ADMIN : Role.USER;
            users = users.stream()
                    .filter(u -> u.getRole() == targetRole)
                    .collect(Collectors.toList());
        }

        // Advanced search by item ratings
        if (request.getItemRatingCriteria() != null &&
                !request.getItemRatingCriteria().isEmpty()) {
            users = filterByItemRatings(users, request.getItemRatingCriteria());
        }

        // Map to response
        List<UserProfileResponse> responses = users.stream()
                .filter(u -> !u.getId().equals(currentUserId)) // Exclude current user
                .map(u -> mapToProfileResponse(u, currentUserId))
                .collect(Collectors.toList());

        // Sort
        responses = sortUsers(responses, request);

        // Paginate
        Pageable pageable = PageRequest.of(page, size);
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), responses.size());

        List<UserProfileResponse> pageContent = responses.subList(start, end);
        return new PageImpl<>(pageContent, pageable, responses.size());
    }

    private List<User> filterByItemRatings(List<User> users,
                                           List<UserSearchRequest.ItemRatingCriteria> criteria) {
        if (criteria.size() > 5) {
            criteria = criteria.subList(0, 5); // Max 5 items
        }

        List<Long> mediaItemIds = criteria.stream()
                .map(UserSearchRequest.ItemRatingCriteria::getMediaItemId)
                .collect(Collectors.toList());

        List<UserSearchRequest.ItemRatingCriteria> finalCriteria = criteria;
        return users.stream()
                .filter(user -> {
                    List<com.amir.mediatracker.entity.UserMediaList> userRatings =
                            userMediaListRepository.findByUserIdAndMediaItemIdInAndRatingIsNotNull(
                                    user.getId(), mediaItemIds);

                    // User must have rated ALL specified items
                    if (userRatings.size() != finalCriteria.size()) {
                        return false;
                    }

                    // Check if all ratings are within specified ranges
                    for (UserSearchRequest.ItemRatingCriteria criterion : finalCriteria) {
                        boolean matchesRating = userRatings.stream()
                                .anyMatch(rating ->
                                        rating.getMediaItem().getId().equals(criterion.getMediaItemId()) &&
                                                rating.getRating() >= criterion.getMinRating() &&
                                                rating.getRating() <= criterion.getMaxRating()
                                );
                        if (!matchesRating) {
                            return false;
                        }
                    }
                    return true;
                })
                .collect(Collectors.toList());
    }

    private List<UserProfileResponse> sortUsers(List<UserProfileResponse> users,
                                                UserSearchRequest request) {
        String sortBy = request.getSortBy() != null ? request.getSortBy() : "lastActive";
        boolean ascending = "asc".equalsIgnoreCase(request.getSortDirection());

        Comparator<UserProfileResponse> comparator;

        switch (sortBy) {
            case "registrationDate":
                comparator = Comparator.comparing(UserProfileResponse::getCreatedAt);
                break;
            case "ratingsCount":
                comparator = Comparator.comparing(UserProfileResponse::getRatingsCount);
                break;
            case "followersCount":
                comparator = Comparator.comparing(UserProfileResponse::getFollowersCount);
                break;
            case "lastActive":
            default:
                comparator = Comparator.comparing(UserProfileResponse::getLastActive,
                        Comparator.nullsLast(Comparator.naturalOrder()));
                break;
        }

        // CHANGE THIS LOGIC - if NOT ascending, reverse the comparator
        if (!ascending) {
            comparator = comparator.reversed();
        }

        return users.stream().sorted(comparator).collect(Collectors.toList());
    }

    private UserProfileResponse mapToProfileResponse(User user, Long currentUserId) {
        long ratingsCount = userMediaListRepository.countByUserIdAndRatingIsNotNull(user.getId());
        long followersCount = userFollowRepository.countByFollowingId(user.getId());
        boolean isFollowing = userFollowRepository.existsByFollowerIdAndFollowingId(
                currentUserId, user.getId());

        return UserProfileResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getShowEmail() ? user.getEmail() : null)
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .lastActive(user.getLastActive())
                .ratingsCount(ratingsCount)
                .followersCount(followersCount)
                .isFollowing(isFollowing)
                .build();
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getUserProfile(Long userId, Long currentUserId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getIsInvisible() && !userId.equals(currentUserId)) {
            throw new RuntimeException("User profile is private");
        }

        return mapToProfileResponse(user, currentUserId);
    }
}