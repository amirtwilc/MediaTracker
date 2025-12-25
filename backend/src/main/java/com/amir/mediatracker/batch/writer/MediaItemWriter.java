package com.amir.mediatracker.batch.writer;

import com.amir.mediatracker.entity.MediaItem;
import com.amir.mediatracker.repository.MediaItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.item.Chunk;
import org.springframework.batch.item.ItemWriter;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Optional;

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
    public void write(Chunk<? extends MediaItem> items) {
        for (MediaItem item : items) {
            Optional<MediaItem> existingItem = mediaItemRepository
                    .findByNameAndCategory(item.getName(), item.getCategory());

            if (existingItem.isPresent()) {
                MediaItem existing = existingItem.get();
                existing.setGenres(item.getGenres());
                existing.setPlatforms(item.getPlatforms());
                existing.setUpdatedAt(LocalDateTime.now());
                item = mediaItemRepository.save(existing);
                log.info("MediaItemWriter::write() item updated: {}", item);
            } else {
                // Insert new item
                item = mediaItemRepository.save(item);
                log.info("MediaItemWriter::write() new item saved: {}", item);
            }
        }
    }
}
