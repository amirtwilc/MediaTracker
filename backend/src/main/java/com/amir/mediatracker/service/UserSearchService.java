package com.amir.mediatracker.service;

import com.amir.mediatracker.dto.UserSortBy;
import com.amir.mediatracker.dto.request.AdvancedUserSearchRequest;
import com.amir.mediatracker.dto.request.BasicUserSearchRequest;
import com.amir.mediatracker.dto.response.UserProfileResponse;
import com.amir.mediatracker.entity.User;
import com.amir.mediatracker.exception.BadRequestException;
import com.amir.mediatracker.repository.UserFollowRepository;
import com.amir.mediatracker.repository.UserMediaListRepository;
import com.amir.mediatracker.repository.UserRepository;
import com.amir.mediatracker.repository.UserSearchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.query.SortDirection;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserSearchService {

    @Value("${app.user-profile.advanced-search.max-criteria}")
    int advancedSearchMaxCriteria;

    private final UserRepository userRepository;
    private final UserMediaListRepository userMediaListRepository;
    private final UserFollowRepository userFollowRepository;

    private final UserSearchRepository repository;

    @Transactional(readOnly = true)
    public Page<UserProfileResponse> basicSearch(Long userId, BasicUserSearchRequest req) {
        Pageable pageable = PageRequest.of(req.page(), req.size());

        return repository.basicSearch(
                userId,
                normalize(req.username()),
                req.adminOnly(),
                defaultSort(req.sortBy()),
                defaultDir(req.sortDirection()),
                pageable
        );
    }

    @Transactional(readOnly = true)
    public Page<UserProfileResponse> advancedSearch(Long userId, AdvancedUserSearchRequest req) {
        if (req.itemRatingCriteria().size() > advancedSearchMaxCriteria) {
            throw new BadRequestException("itemRatingCriteria cannot be larger than " + advancedSearchMaxCriteria);
        }

        Pageable pageable = PageRequest.of(req.page(), req.size());
        return repository.advancedSearch(
                userId,
                req.itemRatingCriteria(),
                defaultSort(req.sortBy()),
                defaultDir(req.sortDirection()),
                pageable
        );
    }

    private String normalize(String username) {
        return (username == null || username.isBlank()) ? null : username;
    }

    private UserSortBy defaultSort(UserSortBy sortBy) {
        return sortBy != null ? sortBy : UserSortBy.LAST_ACTIVE;
    }

    private SortDirection defaultDir(SortDirection dir) {
        return dir != null ? dir : SortDirection.DESCENDING;
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