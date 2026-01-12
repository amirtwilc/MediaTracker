package com.amir.mediatracker.service;

import com.amir.mediatracker.dto.Category;
import com.amir.mediatracker.dto.request.UpdateMediaListRequest;
import com.amir.mediatracker.dto.response.*;
import com.amir.mediatracker.entity.*;
import com.amir.mediatracker.exception.DuplicateResourceException;
import com.amir.mediatracker.exception.ResourceNotFoundException;
import com.amir.mediatracker.repository.MediaItemRepository;
import com.amir.mediatracker.repository.UserMediaListRepository;
import com.amir.mediatracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserMediaListService {

    private final UserMediaListRepository userMediaListRepository;

    private final MediaItemRepository mediaItemRepository;

    private final UserRepository userRepository;

    private final RatingService ratingService;

    private void updateLastActive(Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            user.setLastActive(LocalDateTime.now());
            userRepository.save(user);
        }
    }

    public List<UserMediaListResponse> getUserMediaList(Long userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("mediaItem.name").ascending());
        Page<UserMediaList> list = userMediaListRepository.findByUserId(userId, pageable);
        return list.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public UserMediaListSearchResponse getUserMediaListCursor(
            Long userId,
            String searchQuery,
            Set<Category> categories,
            Set<Long> genreIds,
            Set<Long> platformIds,
            Boolean wishToExperience,
            String cursorName,
            Long cursorId,
            int limit
    ) {
        Pageable pageable = PageRequest.of(0, limit + 1);

        Set<Long> safeGenres = genreIds == null ? Set.of() : genreIds;
        Set<Long> safePlatforms = platformIds == null ? Set.of() : platformIds;
        Set<Category> safeCategories = (categories == null || categories.isEmpty()) ? null : categories;
        boolean safeWishToExperience = wishToExperience != null && wishToExperience;
        String safeSearchQuery = searchQuery == null ? "" : searchQuery;
        String safeCursorName = cursorName == null ? "" : cursorName;
        Long safeCursorId = cursorId == null ? 0L : cursorId;

        // Get total count with filters
        long totalCount;
        try {
            totalCount = userMediaListRepository.countByUserIdWithFiltersSimple(
                    userId,
                    safeSearchQuery,
                    safeCategories,
                    safeGenres.isEmpty() ? null : safeGenres,
                    safePlatforms.isEmpty() ? null : safePlatforms,
                    safeWishToExperience
            );
        } catch (Exception e) {
            log.error("Failed to count with filters", e);
            totalCount = userMediaListRepository.countByUserId(userId);
        }

        // Fetch items with cursor and filters (sorted by name by default)
        List<UserMediaList> items = userMediaListRepository.findByUserIdWithFilters(
                userId,
                safeSearchQuery,
                safeCategories,
                safeGenres.isEmpty() ? null : safeGenres,
                safePlatforms.isEmpty() ? null : safePlatforms,
                safeGenres.size(),
                safePlatforms.size(),
                safeWishToExperience,
                safeCursorName,
                safeCursorId,
                pageable
        );

        boolean hasMore = items.size() > limit;
        if (hasMore) {
            items = items.subList(0, limit);
        }

        List<UserMediaListResponse> responses = items.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        UserMediaListSearchResponse.Cursor nextCursor = null;
        if (hasMore && !items.isEmpty()) {
            UserMediaList last = items.get(items.size() - 1);
            nextCursor = new UserMediaListSearchResponse.Cursor(
                    last.getMediaItem().getName(),
                    last.getId()
            );
        }

        return UserMediaListSearchResponse.builder()
                .items(responses)
                .nextCursor(nextCursor)
                .hasMore(hasMore)
                .totalCount(totalCount)
                .build();
    }

    public Page<UserMediaListResponse> getUserMediaListSorted(
            Long userId,
            String searchQuery,
            Set<Category> categories,
            Set<Long> genreIds,
            Set<Long> platformIds,
            Boolean wishToExperience,
            int page,
            int size,
            String sortBy,
            String sortDirection
    ) {
        Set<Long> safeGenres = genreIds == null ? Set.of() : genreIds;
        Set<Long> safePlatforms = platformIds == null ? Set.of() : platformIds;
        Set<Category> safeCategories = (categories == null || categories.isEmpty()) ? null : categories;
        boolean safeWishToExperience = wishToExperience != null && wishToExperience;
        String safeSearchQuery = searchQuery == null ? "" : searchQuery;
        String safeSortBy = sortBy == null || sortBy.isEmpty() ? "name" : sortBy;
        String safeSortDirection = sortDirection == null || sortDirection.isEmpty() ? "ASC" : sortDirection.toUpperCase();

        // Build the Sort object
        Sort sort = buildSort(safeSortBy, safeSortDirection);
        Pageable pageable = PageRequest.of(page, size, sort);

        // Fetch page with sorting
        Page<UserMediaList> itemsPage = userMediaListRepository.findByUserIdWithFiltersSorted(
                userId,
                safeSearchQuery,
                safeCategories,
                safeGenres.isEmpty() ? null : safeGenres,
                safePlatforms.isEmpty() ? null : safePlatforms,
                safeGenres.size(),
                safePlatforms.size(),
                safeWishToExperience,
                pageable
        );

        // Map to response
        return itemsPage.map(this::mapToResponse);
    }

    private Sort buildSort(String sortBy, String sortDirection) {
        Sort.Direction direction = "DESC".equalsIgnoreCase(sortDirection)
                ? Sort.Direction.DESC
                : Sort.Direction.ASC;

        // Map frontend sort keys to entity properties
        String property;
        switch (sortBy) {
            case "name":
                property = "mediaItem.name";
                break;
            case "year":
                property = "mediaItem.year";
                break;
            case "experienced":
                property = "experienced";
                break;
            case "reexperience":
                property = "wishToReexperience";
                break;
            case "rating":
                property = "rating";
                break;
            default:
                property = "mediaItem.name";
        }

        // Add secondary sort by ID for stable ordering
        return Sort.by(direction, property).and(Sort.by(Sort.Direction.ASC, "id"));
    }

    @Transactional
    public UserMediaListResponse addMediaToList(Long userId, Long mediaItemId) {
        updateLastActive(userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        MediaItem mediaItem = mediaItemRepository.findById(mediaItemId)
                .orElseThrow(() -> new ResourceNotFoundException("Media item not found"));

        // Check if already in list
        Optional<UserMediaList> existing = userMediaListRepository
                .findByUserIdAndMediaItemId(userId, mediaItemId);

        if (existing.isPresent()) {
            throw new DuplicateResourceException("Media item already in your list");
        }

        UserMediaList listItem = new UserMediaList();
        listItem.setUser(user);
        listItem.setMediaItem(mediaItem);
        listItem.setExperienced(false);
        listItem.setWishToReexperience(false);

        UserMediaList saved = userMediaListRepository.save(listItem);
        return mapToResponse(saved);
    }

    @Transactional
    public UserMediaListResponse updateMediaListItem(
            Long userId, Long listItemId, UpdateMediaListRequest request) {
        updateLastActive(userId);
        UserMediaList listItem = userMediaListRepository
                .findByIdAndUserId(listItemId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Media list item not found"));

        if (request.getExperienced() != null) {
            listItem.setExperienced(request.getExperienced());
        }

        if (request.getWishToReexperience() != null) {
            listItem.setWishToReexperience(request.getWishToReexperience());
        }

        if (request.getComment() != null) {
            listItem.setComment(request.getComment());
        }

        // If rating is being set/updated, use RatingService to trigger Kafka event
        if (request.getRating() != null) {
            listItem.setRating(request.getRating());
            ratingService.rateMedia(userId, listItem);
        }

        listItem.setUpdatedAt(LocalDateTime.now());
        UserMediaList saved = userMediaListRepository.save(listItem);
        return mapToResponse(saved);
    }

    @Transactional
    public void removeMediaFromList(Long userId, Long listItemId) {
        updateLastActive(userId);
        UserMediaList listItem = userMediaListRepository
                .findByIdAndUserId(listItemId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Media list item not found"));

        userMediaListRepository.delete(listItem);
    }

    private UserMediaListResponse mapToResponse(UserMediaList item) {
        return UserMediaListResponse.builder()
                .id(item.getId())
                .mediaItem(mapMediaItemToResponse(item.getMediaItem()))
                .experienced(item.getExperienced())
                .wishToReexperience(item.getWishToReexperience())
                .rating(item.getRating())
                .comment(item.getComment())
                .addedAt(item.getAddedAt())
                .updatedAt(item.getUpdatedAt())
                .build();
    }

    private MediaItemResponse mapMediaItemToResponse(MediaItem item) {
        return MediaItemResponse.builder()
                .id(item.getId())
                .category(item.getCategory())
                .name(item.getName())
                .year(item.getYear())
                .avgRating(item.getAvgRating())
                .genres(item.getGenres().stream()
                        .map(g -> GenreResponse.builder()
                                .id(g.getId())
                                .name(g.getName())
                                .build())
                        .collect(Collectors.toSet()))
                .platforms(item.getPlatforms().stream()
                        .map(p -> PlatformResponse.builder()
                                .id(p.getId())
                                .name(p.getName())
                                .build())
                        .collect(Collectors.toSet()))
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .build();
    }

    public List<GenreResponse> getUserGenres(Long userId, String searchQuery, Set<Category> categories) {
        String safeSearchQuery = searchQuery == null ? "" : searchQuery;
        Set<Category> safeCategories = (categories == null || categories.isEmpty()) ? null : categories;
        List<Genre> genres = userMediaListRepository.findDistinctGenresByUserId(
                userId, safeSearchQuery, safeCategories
        );
        return genres.stream()
                .map(g -> GenreResponse.builder().id(g.getId()).name(g.getName()).build())
                .collect(Collectors.toList());
    }

    public List<PlatformResponse> getUserPlatforms(Long userId, String searchQuery, Set<Category> categories) {
        String safeSearchQuery = searchQuery == null ? "" : searchQuery;
        Set<Category> safeCategories = (categories == null || categories.isEmpty()) ? null : categories;
        List<Platform> platforms = userMediaListRepository.findDistinctPlatformsByUserId(
                userId, safeSearchQuery, safeCategories
        );
        return platforms.stream()
                .map(p -> PlatformResponse.builder().id(p.getId()).name(p.getName()).build())
                .collect(Collectors.toList());
    }
}
