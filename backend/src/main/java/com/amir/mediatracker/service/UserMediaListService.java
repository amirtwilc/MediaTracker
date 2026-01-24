package com.amir.mediatracker.service;

import com.amir.mediatracker.dto.Category;
import com.amir.mediatracker.dto.SortDirection;
import com.amir.mediatracker.dto.UserSearchMediaSortBy;
import com.amir.mediatracker.dto.request.UpdateMediaListRequest;
import com.amir.mediatracker.dto.response.*;
import com.amir.mediatracker.entity.*;
import com.amir.mediatracker.exception.DuplicateResourceException;
import com.amir.mediatracker.exception.ForbiddenException;
import com.amir.mediatracker.exception.ResourceNotFoundException;
import com.amir.mediatracker.kafka.RatingProducer;
import com.amir.mediatracker.kafka.event.RatingEvent;
import com.amir.mediatracker.repository.MediaItemRepository;
import com.amir.mediatracker.repository.UserMediaListRepository;
import com.amir.mediatracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserMediaListService {

    @Value("${app.search.max-limit}")
    private int maxLimit;

    private final UserMediaListRepository userMediaListRepository;
    private final MediaItemRepository mediaItemRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher applicationEventPublisher;

    /**
     * Update last_active field in user table.
     * Should be called whenever a user performs an action on it's list
     * @param userId Id of the user
     */
    private void updateLastActive(Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            user.setLastActive(LocalDateTime.now());
            userRepository.save(user);
        }
    }

    /**
     * Retrieve a user list with cursor pagination.
     * Supports filtering by name, categories, genres, platforms and wishToExperience.
     * @param displayUserId The user for which to display the list. Must be visible if different from requestorUserId
     * @param requestorUserId The user who initiated the call
     * @param searchQuery name search criteria. For example: "The Matri" might return the movie The Matrix
     * @param categories Optional filter for categories. For example: Return only MOVIES and SERIES
     * @param genreIds Optional filter for genres. For example: Return only items that contain exactly these genres: Action and Drama
     * @param platformIds Optional filter for platforms. For example: Return only items that contain exactly these platforms: Netflix and HBO Max
     * @param wishToExperience Optional filter to display only items that have not been experienced or are not checked with re-experience
     * @param cursorName Name of the item used for cursoring. Providing this name results in providing a page that starts with next item
     * @param cursorId Id of the item used for cursoring. Providing this name results in providing a page that starts with next item
     * @param limit Number of items to return
     * @return UserMediaListSearchResponse
     */
    public UserMediaListSearchResponse getUserMediaListCursor(
            Long displayUserId,
            Long requestorUserId,
            String searchQuery,
            Set<Category> categories,
            Set<Long> genreIds,
            Set<Long> platformIds,
            Boolean wishToExperience,
            String cursorName,
            Long cursorId,
            int limit
    ) {
        limit = Math.min(Math.max(limit, 1), maxLimit); //avoid negative and overflow
        displayUserId = decideWhichUserToShow(displayUserId, requestorUserId);
        Pageable pageable = PageRequest.of(0, limit + 1);

        // Safe inputs
        Set<Long> safeGenres = (genreIds == null  || genreIds.isEmpty()) ? null : genreIds;
        Set<Long> safePlatforms = (platformIds == null  || platformIds.isEmpty()) ? null : platformIds;
        Set<Category> safeCategories = (categories == null || categories.isEmpty()) ? null : categories;
        boolean safeWishToExperience = wishToExperience != null && wishToExperience;
        String safeSearchQuery = searchQuery == null ? "" : searchQuery;
        String safeCursorName = cursorName == null ? "" : cursorName;
        Long safeCursorId = cursorId == null ? 0L : cursorId;

        // Get total count with filters
        long totalCount = userMediaListRepository.countByUserIdWithFilters(
                displayUserId,
                safeSearchQuery,
                safeCategories,
                safeGenres,
                safePlatforms,
                safeGenres == null ? 0 : safeGenres.size(),
                safePlatforms == null ? 0 : safePlatforms.size(),
                safeWishToExperience
        );

        // Fetch items with cursor and filters (sorted by name by default)
        List<UserMediaList> items = userMediaListRepository.findByUserIdWithFilters(
                displayUserId,
                safeSearchQuery,
                safeCategories,
                safeGenres,
                safePlatforms,
                safeGenres == null ? 0 : safeGenres.size(),
                safePlatforms == null ? 0 : safePlatforms.size(),
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
            UserMediaList last = items.getLast();
            nextCursor = new UserMediaListSearchResponse.Cursor(
                    last.getMediaItem().getName(),
                    last.getMediaItem().getId()
            );
        }

        return UserMediaListSearchResponse.builder()
                .items(responses)
                .nextCursor(nextCursor)
                .hasMore(hasMore)
                .totalCount(totalCount)
                .build();
    }

    /**
     * Retrieves a user list with sorting option.
     * Supports paging
     * @param displayUserId The user for which to display the list. Must be visible if different from requestorUserId
     * @param requestorUserId The user who initiated the call
     * @param searchQuery name search criteria. For example: "The Matri" might return the movie The Matrix
     * @param categories Optional filter for categories. For example: Return only MOVIES and SERIES
     * @param genreIds Optional filter for genres. For example: Return only items that contain exactly these genres: Action and Drama
     * @param platformIds Optional filter for platforms. For example: Return only items that contain exactly these platforms: Netflix and HBO Max
     * @param wishToExperience Optional filter to display only items that have not been experienced or are not checked with re-experience
     * @param page The page to return
     * @param size The size of the page
     * @param sortBy By which column to perform the sort - Name, Year, Experienced, Reexperience, Rating. Default is Name
     * @param sortDirection Whether the sort it ASC or DESC. Default is ASC
     * @return A page of UserMediaListResponse
     */
    public Page<UserMediaListResponse> getUserMediaListSorted(
            Long displayUserId,
            Long requestorUserId,
            String searchQuery,
            Set<Category> categories,
            Set<Long> genreIds,
            Set<Long> platformIds,
            Boolean wishToExperience,
            int page,
            int size,
            UserSearchMediaSortBy sortBy,
            SortDirection sortDirection
    ) {
        size = Math.min(Math.max(size, 1), maxLimit); //avoid negative and overflow
        displayUserId = decideWhichUserToShow(displayUserId, requestorUserId);

        // Safe inputs
        String safeSearchQuery = searchQuery == null ? "" : searchQuery;
        Set<Category> safeCategories = (categories == null || categories.isEmpty()) ? null : categories;
        Set<Long> safeGenres = (genreIds == null  || genreIds.isEmpty()) ? null : genreIds;
        Set<Long> safePlatforms = (platformIds == null  || platformIds.isEmpty()) ? null : platformIds;
        boolean safeWishToExperience = wishToExperience != null && wishToExperience;
        UserSearchMediaSortBy safeSortBy = sortBy == null ? UserSearchMediaSortBy.NAME : sortBy;

        // Build sort
        Sort.Direction direction = SortDirection.DESC.equals(sortDirection)
                ? Sort.Direction.DESC
                : Sort.Direction.ASC;
        Sort sort = buildSort(safeSortBy, direction);

        // Fetch page with sorting
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<UserMediaList> itemsPage = userMediaListRepository.findByUserIdWithFiltersSorted(
                displayUserId,
                safeSearchQuery,
                safeCategories,
                safeGenres,
                safePlatforms,
                safeGenres == null ? 0 : safeGenres.size(),
                safePlatforms == null ? 0 : safePlatforms.size(),
                safeWishToExperience,
                pageable
        );

        return itemsPage.map(this::mapToResponse);
    }

    private Sort buildSort(UserSearchMediaSortBy sortBy, Sort.Direction direction) {

        String property = switch (sortBy) {
            case UserSearchMediaSortBy.YEAR -> "mediaItem.year";
            case UserSearchMediaSortBy.EXPERIENCED -> "experienced";
            case UserSearchMediaSortBy.REEXPERIENCE -> "wishToReexperience";
            case UserSearchMediaSortBy.RATING -> "rating";
            default -> "mediaItem.name";
        };

        return Sort.by(direction, property).and(Sort.by(Sort.Direction.ASC, "id")); //allows order consistency
    }

    /**
     * Add a new media item to a user list.
     * Item is saved with default values
     * @param userId Id of the user for which to attach the media item
     * @param mediaItemId The media item id to add to user list
     * @return UserMediaListResponse
     */
    @Transactional
    public UserMediaListResponse addMediaToList(Long userId, Long mediaItemId) {
        updateLastActive(userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        MediaItem mediaItem = mediaItemRepository.findById(mediaItemId)
                .orElseThrow(() -> new ResourceNotFoundException("Media item not found"));

        UserMediaList listItem = new UserMediaList();
        listItem.setUser(user);
        listItem.setMediaItem(mediaItem);
        listItem.setExperienced(false);
        listItem.setWishToReexperience(false);
        try {
            UserMediaList saved = userMediaListRepository.save(listItem);
            return mapToResponse(saved);
        } catch (DataIntegrityViolationException e) {
            throw new DuplicateResourceException("Media item already in user list");
        }
    }

    /**
     * Updates non-null values to UserMediaList table.
     * Rating and Reexperience flag may only be set if experience flag is checked.
     * Rating an item initiates an event to send a notification to followers.
     * @param userId The user id for which the list belongs
     * @param request UpdateMediaListRequest
     * @return UserMediaListResponse
     */
    @Transactional
    public UserMediaListResponse updateMediaListItem(
            Long userId, UpdateMediaListRequest request) {
        updateLastActive(userId);
        UserMediaList listItem = userMediaListRepository
                .findByIdAndUserId(request.getId(), userId)
                .orElseThrow(() -> new ResourceNotFoundException("Media list item not found"));

        if (request.getExperienced() != null) {
            listItem.setExperienced(request.getExperienced());
            if (Boolean.FALSE.equals(request.getExperienced())) {
                listItem.setWishToReexperience(false);
                listItem.setRating(null);
            }
        }

        if (request.getComment() != null) {
            listItem.setComment(request.getComment());
        }

        if (listItem.getExperienced() != null
                && listItem.getExperienced()) {

            if (request.getWishToReexperience() != null) {
                listItem.setWishToReexperience(request.getWishToReexperience());
            }

            // If rating is being set/updated, trigger Kafka event
            if (request.getRating() != null
                    && !request.getRating().equals(listItem.getRating())) {
                listItem.setRating(request.getRating());
                applicationEventPublisher.publishEvent(createRatingEvent(userId, listItem));
            }
        }

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

    private Long decideWhichUserToShow(Long displayUserId, Long requestorUserId) {
        if (displayUserId == null) {
            displayUserId = requestorUserId;
        } else if (!displayUserId.equals(requestorUserId)) {
            boolean isInvisible = userRepository.isUserInvisible(displayUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            if (isInvisible) {
                throw new ForbiddenException("User list is private");
            }
        }

        return displayUserId;
    }

    /**
     * Handles rating of a media item by sending a Kafka message
     * @param userId The id of the user who rated the item
     * @param listItem The list item that was rated
     */
    public RatingEvent createRatingEvent(Long userId, UserMediaList listItem) {

        RatingEvent event = new RatingEvent();
        event.setUserId(userId);
        event.setUsername(listItem.getUser().getUsername());
        event.setMediaItemId(listItem.getMediaItem().getId());
        event.setMediaItemName(listItem.getMediaItem().getName());
        event.setRating(listItem.getRating());
        event.setTimestamp(LocalDateTime.now());

        return event;
    }
}
