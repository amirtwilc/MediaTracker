package com.amir.mediatracker.kafka;

import com.amir.mediatracker.entity.MediaItem;
import com.amir.mediatracker.entity.UserFollow;
import com.amir.mediatracker.entity.UserMediaList;
import com.amir.mediatracker.kafka.event.RatingEvent;
import com.amir.mediatracker.repository.MediaItemRepository;
import com.amir.mediatracker.repository.UserFollowRepository;
import com.amir.mediatracker.repository.UserMediaListRepository;
import com.amir.mediatracker.service.NotificationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Objects;

@Service
@Slf4j
public class RatingConsumer {

    @Autowired
    private UserFollowRepository userFollowRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private UserMediaListRepository userMediaListRepository;

    @Autowired
    private MediaItemRepository mediaItemRepository;

    @KafkaListener(topics = "media-ratings", groupId = "rating-notification-group")
    @Transactional
    public void consumeRatingEvent(RatingEvent event) {
        log.info("Received rating event: userId={}, mediaItemId={}, rating={}",
                event.getUserId(), event.getMediaItemId(), event.getRating());

        try {
            // 1. Calculate and update average rating for the media item
            updateAverageRating(event.getMediaItemId());

            // 2. Find all users following the rating giver
            List<UserFollow> followers = userFollowRepository
                    .findByFollowingId(event.getUserId());

            log.info("Found {} followers for user {}", followers.size(), event.getUserId());

            // 3. Send notifications to followers if rating exceeds their threshold
            for (UserFollow follow : followers) {
                if (event.getRating().compareTo(follow.getMinimumRatingThreshold()) >= 0) {
                    String message = String.format(
                            "%s rated '%s' with %d stars",
                            event.getUsername(),
                            event.getMediaItemName(),
                            event.getRating()
                    );

                    notificationService.createNotification(
                            follow.getFollower().getId(),
                            message,
                            event.getMediaItemId(),
                            event.getRating(),
                            event.getUserId()
                    );

                    log.info("Notification sent to user {}", follow.getFollower().getId());
                }
            }
        } catch (Exception e) {
            log.error("Error processing rating event", e);
        }
    }

    /**
     * Calculate and update the average rating for a media item
     */
    private void updateAverageRating(Long mediaItemId) {
        try {
            // Query all ratings for this media item from user_media_list
            List<Short> ratings = userMediaListRepository
                    .findAllByMediaItemIdAndRatingIsNotNull(mediaItemId)
                    .stream()
                    .map(UserMediaList::getRating)
                    .filter(Objects::nonNull)
                    .toList();

            if (ratings.isEmpty()) {
                log.info("No ratings found for media item {}", mediaItemId);
                return;
            }

            // Calculate average
            double sum = ratings.stream().mapToInt(Short::intValue).sum();
            double average = sum / ratings.size();

            // Round to 1 decimal place
            BigDecimal avgRating = BigDecimal.valueOf(average)
                    .setScale(1, RoundingMode.HALF_UP);

            // Update media item
            MediaItem mediaItem = mediaItemRepository.findById(mediaItemId)
                    .orElseThrow(() -> new RuntimeException("Media item not found: " + mediaItemId));

            mediaItem.setAvgRating(avgRating);
            mediaItemRepository.save(mediaItem);

            log.info("Updated average rating for media item {}: {} (from {} ratings)",
                    mediaItemId, avgRating, ratings.size());

        } catch (Exception e) {
            log.error("Failed to update average rating for media item {}", mediaItemId, e);
        }
    }
}