package com.amir.mediatracker.kafka;

import com.amir.mediatracker.aop.LogAround;
import com.amir.mediatracker.entity.MediaItem;
import com.amir.mediatracker.entity.UserFollow;
import com.amir.mediatracker.entity.UserMediaList;
import com.amir.mediatracker.kafka.event.RatingEvent;
import com.amir.mediatracker.repository.MediaItemRepository;
import com.amir.mediatracker.repository.UserFollowRepository;
import com.amir.mediatracker.repository.UserMediaListRepository;
import com.amir.mediatracker.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.DltHandler;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.kafka.retrytopic.DltStrategy;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.retry.annotation.Backoff;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Objects;

@Slf4j
@Service
@LogAround
@RequiredArgsConstructor
public class RatingConsumer {

    private final UserFollowRepository userFollowRepository;
    private final NotificationService notificationService;
    private final UserMediaListRepository userMediaListRepository;
    private final MediaItemRepository mediaItemRepository;

    /**
     * Handling a rating event by:
     * 1. Recalculate the average rating for given media and update it to the media item table
     * 2. Search followers of given user and send them a notification if rating is above requested threshold
     * @param event RatingEvent
     */
    @KafkaListener(topics = "#{'${spring.kafka.topics.media-rating-topic}'}", groupId = "rating-notification-group")
    @RetryableTopic(
            attempts = "4", // initial + 3 retries
            backoff = @Backoff(
                    delay = 1000,
                    multiplier = 2.0
            ),
            dltStrategy = DltStrategy.FAIL_ON_ERROR
    )
    @Transactional
    public void consumeRatingEvent(RatingEvent event) {
        log.info("Consumed rating event: userId={}, mediaItemId={}, rating={}",
                event.getUserId(), event.getMediaItemId(), event.getRating());

            updateAverageRating(event.getMediaItemId());

            List<UserFollow> followers = userFollowRepository
                    .findByFollowingId(event.getUserId());

            log.debug("Found {} followers for user {}", followers.size(), event.getUserId());

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

                    log.debug("Notification sent to user {}", follow.getFollower().getId());
                }
            }
    }

    /**
     * Calculate and update the average rating for a media item
     * @param mediaItemId The media item id for which to calculate the average rating
     */
    private void updateAverageRating(Long mediaItemId) {
        //Fetch all ratings
        List<Short> ratings = userMediaListRepository
                .findAllByMediaItemIdAndRatingIsNotNull(mediaItemId)
                .stream()
                .map(UserMediaList::getRating)
                .filter(Objects::nonNull)
                .toList();

        if (ratings.isEmpty()) {
            log.debug("No ratings found for media item {}", mediaItemId);
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
    }

    @DltHandler
    public void handleDlt(
            RatingEvent event,
            @Header(KafkaHeaders.EXCEPTION_MESSAGE) String error
    ) {
        log.error("Message sent to DLT: {}, reason={}", event, error);
    }
}