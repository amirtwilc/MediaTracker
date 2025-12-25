package com.amir.mediatracker.kafka;

import com.amir.mediatracker.entity.UserFollow;
import com.amir.mediatracker.kafka.event.RatingEvent;
import com.amir.mediatracker.repository.UserFollowRepository;
import com.amir.mediatracker.service.NotificationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@Slf4j
public class RatingConsumer {

    @Autowired
    private UserFollowRepository userFollowRepository;

    @Autowired
    private NotificationService notificationService;

    @KafkaListener(topics = "media-ratings", groupId = "rating-notification-group")
    public void consumeRatingEvent(RatingEvent event) {
        log.info("Received rating event: userId={}, mediaItemId={}, rating={}",
                event.getUserId(), event.getMediaItemId(), event.getRating());

        try {
            // Find all users following the rating giver
            List<UserFollow> followers = userFollowRepository
                    .findByFollowingId(event.getUserId());

            log.info("Found {} followers for user {}", followers.size(), event.getUserId());

            for (UserFollow follow : followers) {
                // Check if rating exceeds follower's threshold
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
}
