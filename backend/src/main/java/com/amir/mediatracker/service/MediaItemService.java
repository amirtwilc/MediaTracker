package com.amir.mediatracker.service;

import com.amir.mediatracker.dto.Category;
import com.amir.mediatracker.dto.response.GenreResponse;
import com.amir.mediatracker.dto.response.MediaItemResponse;
import com.amir.mediatracker.dto.response.MediaSearchResponse;
import com.amir.mediatracker.dto.response.PlatformResponse;
import com.amir.mediatracker.entity.MediaItem;
import com.amir.mediatracker.repository.MediaItemRepository;
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

    public MediaSearchResponse searchMediaItemsCursor(
            String query,
            Category category,
            Set<Long> genreIds,
            Set<Long> platformIds,
            String cursorName,
            Long cursorId,
            int limit
    ) {
        Pageable pageable = PageRequest.of(0, limit + 1);

        Set<Long> safeGenres = genreIds == null ? Set.of() : genreIds;
        Set<Long> safePlatforms = platformIds == null ? Set.of() : platformIds;

        // Get the count first (before pagination)
        long totalCount;
        if (safeGenres.isEmpty() && safePlatforms.isEmpty()) {
            totalCount = mediaItemRepository.countSimple(query, category);
        } else {
            try {
                totalCount = mediaItemRepository.countWithFiltersSimple(
                        query,
                        category,
                        safeGenres.isEmpty() ? null : safeGenres,
                        safePlatforms.isEmpty() ? null : safePlatforms
                );
            } catch (Exception e) {
                log.error("Failed to count with filters, falling back to simple count", e);
                totalCount = mediaItemRepository.countSimple(query, category);
            }
        }

        List<MediaItem> items = mediaItemRepository.searchWithCursorAndFilters(
                query,
                category,
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

    public List<MediaItemResponse> searchMediaItems(String query, Category category, int page, int size) {
        Page<MediaItem> items;

        Pageable pageable = PageRequest.of(page, size, Sort.by("name").ascending());
        if (category != null) {
            items = mediaItemRepository
                    .findByNameContainingIgnoreCaseAndCategory(query, category, pageable);
        } else {
            items = mediaItemRepository.findByNameContainingIgnoreCase(query, pageable);
        }

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
