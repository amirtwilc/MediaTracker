package com.amir.mediatracker.batch.writer;

import com.amir.mediatracker.dto.Category;
import com.amir.mediatracker.entity.MediaItem;
import com.amir.mediatracker.repository.MediaItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.item.Chunk;
import org.springframework.batch.item.ItemWriter;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class MediaItemWriter implements ItemWriter<MediaItem> {

    private final MediaItemRepository mediaItemRepository;

    /**
     * Write a chunk of media items to the database.
     * If the item already exists, update it.
     *
     * @param items The chunk of media items to write
     */
    @Override
    @Transactional
    public void write(Chunk<? extends MediaItem> items) {

        // 1. Extract unique names from chunk
        Set<String> names = new HashSet<>();
        for (MediaItem item : items) {
            names.add(item.getName());
        }

        // 2. Fetch all existing items by name (single query)
        List<MediaItem> existingItems =
                mediaItemRepository.findAllByNameIn(names);

        // 3. Index by (name, category)
        Map<String, MediaItem> existingIndex =
                existingItems.stream()
                        .collect(Collectors.toMap(
                                item -> key(item.getName(), item.getCategory()),
                                Function.identity()
                        ));

        // 4. Upsert logic
        for (MediaItem incoming : items) {
            String key = key(incoming.getName(), incoming.getCategory());
            MediaItem existing = existingIndex.get(key);

            if (existing != null) {
                existing.setGenres(incoming.getGenres());
                existing.setPlatforms(incoming.getPlatforms());
                existing.setYear(incoming.getYear());
                existing.setUpdatedAt(LocalDateTime.now());

                mediaItemRepository.save(existing);
                log.debug("Updated media item: {}", existing);
            } else {
                mediaItemRepository.save(incoming);
                log.debug("Inserted media item: {}", incoming);
            }
        }
    }

    private String key(String name, Category category) {
        return name + "::" + category.name();
    }
}
