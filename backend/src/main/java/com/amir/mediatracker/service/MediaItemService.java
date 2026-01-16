package com.amir.mediatracker.service;

import com.amir.mediatracker.dto.Category;
import com.amir.mediatracker.dto.response.GenreResponse;
import com.amir.mediatracker.dto.response.MediaItemResponse;
import com.amir.mediatracker.dto.response.MediaSearchResponse;
import com.amir.mediatracker.dto.response.PlatformResponse;
import com.amir.mediatracker.entity.Genre;
import com.amir.mediatracker.entity.MediaItem;
import com.amir.mediatracker.entity.Platform;
import com.amir.mediatracker.repository.MediaItemRepository;
import com.amir.mediatracker.repository.UserMediaListRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MediaItemService {

    @Value("${app.search.max-limit}")
    private int maxLimit;

    private final MediaItemRepository mediaItemRepository;
    private final UserMediaListRepository userMediaListRepository;

    /**
     * Search media items with cursor pagination.
     * Supports filtering by name, category, genre, and platform.
     * For each media item, it also checks if the user has added it to their list.
     * @param userId The id of the user
     * @param query name search criteria. For example: "The Matri" might return the movie The Matrix
     * @param categories Optional filter for categories. For example: Return only MOVIES and SERIES
     * @param genreIds Optional filter for genres. For example: Return only items that contain exactly these genres: Action and Drama
     * @param platformIds Optional filter for platforms. For example: Return only items that contain exactly these platforms: Netflix and HBO Max
     * @param cursorName Name of the item used for cursoring. Providing this name results in providing a page that starts with next item
     * @param cursorId Id of the item used for cursoring. Providing this name results in providing a page that starts with next item
     * @param limit Number of items to return
     * @return MediaSearchResponse
     */
    public MediaSearchResponse searchMediaItemsCursor(
            Long userId,
            String query,
            Set<Category> categories,
            Set<Long> genreIds,
            Set<Long> platformIds,
            String cursorName,
            Long cursorId,
            int limit
    ) {
        limit = Math.min(Math.max(limit, 1), maxLimit); //avoid negative and overflow
        Pageable pageable = PageRequest.of(0, limit + 1); // +1 to know if there are more items

        // Safe inputs
        Set<Long> safeGenres = (genreIds == null  || genreIds.isEmpty()) ? null : genreIds;
        Set<Long> safePlatforms = (platformIds == null  || platformIds.isEmpty()) ? null : platformIds;
        Set<Category> safeCategories = (categories == null || categories.isEmpty()) ? null : categories;

        // Get the count first
        long totalCount;
        if (safeGenres == null && safePlatforms == null) {
            totalCount = mediaItemRepository.countSimple(query, safeCategories);
        } else {
            totalCount = mediaItemRepository.countWithFilters(
                    query,
                    safeCategories,
                    safeGenres,
                    safePlatforms,
                    safeGenres == null ? 0 : safeGenres.size(),
                    safePlatforms == null ? 0 : safePlatforms.size()
            );
        }

        List<MediaItem> items = mediaItemRepository.searchWithCursorAndFilters(
                query,
                safeCategories,
                safeGenres,
                safePlatforms,
                safeGenres == null ? 0 : safeGenres.size(),
                safePlatforms == null ? 0 : safePlatforms.size(),
                cursorName,
                cursorId,
                pageable
        );

        boolean hasMore = items.size() > limit;
        if (hasMore) {
            items = items.subList(0, limit);
        }

        // Check which items are in user's list
        if (userId != null && !items.isEmpty()) {
            List<Long> itemIds = items.stream().map(MediaItem::getId).toList();
            Set<Long> userItemIds = userMediaListRepository
                    .findByUserIdAndMediaItemIdIn(userId, itemIds)
                    .stream()
                    .map(uml -> uml.getMediaItem().getId())
                    .collect(Collectors.toSet());

            items.forEach(item -> item.setInUserList(userItemIds.contains(item.getId())));
        }

        List<MediaItemResponse> responses = items.stream()
                .map(this::mapToResponse)
                .toList();

        MediaSearchResponse.Cursor nextCursor = null;
        if (hasMore) {
            MediaItem lastItem = items.getLast();
            nextCursor = new MediaSearchResponse.Cursor(lastItem.getName(), lastItem.getId());
        }

        return MediaSearchResponse.builder()
                .items(responses)
                .nextCursor(nextCursor)
                .hasMore(hasMore)
                .totalCount(totalCount)
                .build();
    }

    public Page<MediaItemResponse> searchMediaItemsSorted(
            Long userId,
            String query,
            Set<Category> categories,
            Set<Long> genreIds,
            Set<Long> platformIds,
            int page,
            int size,
            String sortBy,
            String sortDirection
    ) {
        Set<Long> safeGenres = genreIds == null ? Set.of() : genreIds;
        Set<Long> safePlatforms = platformIds == null ? Set.of() : platformIds;
        Set<Category> safeCategories = (categories == null || categories.isEmpty()) ? null : categories;

        // Build sort
        Sort.Direction direction = "DESC".equalsIgnoreCase(sortDirection)
                ? Sort.Direction.DESC
                : Sort.Direction.ASC;

        String property;
        switch (sortBy) {
            case "year":
                property = "year";
                break;
            case "category":
                property = "category";
                break;
            case "avgRating":
                property = "avgRating";
                break;
            case "name":
            default:
                property = "name";
                break;
        }

        Sort sort = Sort.by(direction, property).and(Sort.by(Sort.Direction.ASC, "id"));
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<MediaItem> itemsPage = mediaItemRepository.searchWithOffsetAndFilters(
                query,
                safeCategories,
                safeGenres.isEmpty() ? null : safeGenres,
                safePlatforms.isEmpty() ? null : safePlatforms,
                safeGenres.size(),
                safePlatforms.size(),
                pageable
        );

        // Check which items are in user's list
        if (userId != null && !itemsPage.isEmpty()) {
            List<Long> itemIds = itemsPage.getContent().stream()
                    .map(MediaItem::getId)
                    .collect(Collectors.toList());
            Set<Long> userItemIds = userMediaListRepository
                    .findByUserIdAndMediaItemIdIn(userId, itemIds)
                    .stream()
                    .map(uml -> uml.getMediaItem().getId())
                    .collect(Collectors.toSet());

            itemsPage.getContent().forEach(item -> item.setInUserList(userItemIds.contains(item.getId())));
        }

        return itemsPage.map(this::mapToResponse);
    }

    /*public List<MediaItemResponse> searchMediaItems(String query, Category category, int page, int size) {
        Page<MediaItem> items;

        Pageable pageable = PageRequest.of(page, size, Sort.by("name").ascending());
        Set<Category> categories = category != null ? Set.of(category) : null;

        items = mediaItemRepository.searchWithOffsetAndFilters(
                query,
                categories,
                null,
                null,
                0,
                0,
                pageable
        );

        return items.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }*/

    /*public MediaItemResponse getMediaItem(Long id) {
        MediaItem item = mediaItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Media item not found"));
        return mapToResponse(item);
    }*/

    private MediaItemResponse mapToResponse(MediaItem item) {
        return MediaItemResponse.builder()
                .id(item.getId())
                .category(item.getCategory())
                .name(item.getName())
                .year(item.getYear())
                .avgRating(item.getAvgRating())
                .inUserList(item.getInUserList())
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

    public List<Genre> getAvailableGenres(String query, Set<Category> categories) {
        Set<Category> safeCategories = (categories == null || categories.isEmpty()) ? null : categories;
        return mediaItemRepository.findDistinctGenresByFilters(query, safeCategories);
    }

    public List<Platform> getAvailablePlatforms(String query, Set<Category> categories) {
        Set<Category> safeCategories = (categories == null || categories.isEmpty()) ? null : categories;
        return mediaItemRepository.findDistinctPlatformsByFilters(query, safeCategories);
    }
}