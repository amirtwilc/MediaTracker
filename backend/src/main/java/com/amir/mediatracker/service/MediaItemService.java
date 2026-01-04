package com.amir.mediatracker.service;

import com.amir.mediatracker.dto.Category;
import com.amir.mediatracker.dto.response.GenreResponse;
import com.amir.mediatracker.dto.response.MediaItemResponse;
import com.amir.mediatracker.dto.response.MediaSearchResponse;
import com.amir.mediatracker.dto.response.PlatformResponse;
import com.amir.mediatracker.entity.MediaItem;
import com.amir.mediatracker.repository.MediaItemRepository;
import com.amir.mediatracker.repository.UserMediaListRepository;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.common.errors.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Slf4j
public class MediaItemService {

    @Autowired
    private MediaItemRepository mediaItemRepository;

    @Autowired
    private UserMediaListRepository userMediaListRepository;

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
        Pageable pageable = PageRequest.of(0, limit + 1);

        Set<Long> safeGenres = genreIds == null ? Set.of() : genreIds;
        Set<Long> safePlatforms = platformIds == null ? Set.of() : platformIds;
        Set<Category> safeCategories = (categories == null || categories.isEmpty()) ? null : categories;

        // Get the count first
        long totalCount;
        if (safeGenres.isEmpty() && safePlatforms.isEmpty()) {
            totalCount = mediaItemRepository.countSimple(query, safeCategories);
        } else {
            try {
                totalCount = mediaItemRepository.countWithFiltersSimple(
                        query,
                        safeCategories,
                        safeGenres.isEmpty() ? null : safeGenres,
                        safePlatforms.isEmpty() ? null : safePlatforms
                );
            } catch (Exception e) {
                log.error("Failed to count with filters, falling back to simple count", e);
                totalCount = mediaItemRepository.countSimple(query, safeCategories);
            }
        }

        List<MediaItem> items = mediaItemRepository.searchWithCursorAndFilters(
                query,
                safeCategories,
                safeGenres.isEmpty() ? null : safeGenres,
                safePlatforms.isEmpty() ? null : safePlatforms,
                safeGenres.size(),
                safePlatforms.size(),
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
            List<Long> itemIds = items.stream().map(MediaItem::getId).collect(Collectors.toList());
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
            MediaItem last = items.get(items.size() - 1);
            nextCursor = new MediaSearchResponse.Cursor(last.getName(), last.getId());
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

    public List<MediaItemResponse> searchMediaItems(String query, Category category, int page, int size) {
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
    }

    public MediaItemResponse getMediaItem(Long id) {
        MediaItem item = mediaItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Media item not found"));
        return mapToResponse(item);
    }

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
}