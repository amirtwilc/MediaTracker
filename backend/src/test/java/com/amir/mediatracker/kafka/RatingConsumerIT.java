package com.amir.mediatracker.kafka;

import com.amir.mediatracker.config.AbstractIntegrationTest;
import com.amir.mediatracker.entity.*;
import com.amir.mediatracker.kafka.event.RatingEvent;
import com.amir.mediatracker.service.NotificationService;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Limit;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.AssertionsForInterfaceTypes.assertThat;
import static org.awaitility.Awaitility.await;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

public class RatingConsumerIT extends AbstractIntegrationTest {

    @MockitoSpyBean
    protected RatingConsumer ratingConsumer;
    @MockitoSpyBean
    protected NotificationService notificationService;

    @Test
    void whenRatingEventSent_shouldRetryUntilDlt() {
        //Arrange
        MediaItem mediaItem = saveBasicMediaItem("someItem");
        User follower = saveUser("follower");
        UserFollow uf = new UserFollow();
        uf.setFollower(follower);
        uf.setFollowing(user);
        uf.setMinimumRatingThreshold((short) 9);
        userFollowRepository.save(uf);

        doThrow(new RuntimeException("Database connection failed"))
                .when(notificationService).createNotification(anyLong(), anyString(), anyLong(), anyShort(), anyLong());

        // Act
        sendRatingEvent(mediaItem, (short) 10);

        // Wait & Assert
        await()
                .atMost(15, TimeUnit.SECONDS)
                .pollInterval(100, TimeUnit.MILLISECONDS)
                .untilAsserted(() -> {
                    verify(ratingConsumer, times(1)).handleDlt(any(RatingEvent.class), any());
                    verify(ratingConsumer, times(4)).consumeRatingEvent(any(RatingEvent.class));
                    List<Notification> notifications = notificationRepository
                            .findByUserIdOrderByCreatedAtDesc(follower.getId(), Limit.of(3));
                    assertThat(notifications).isEmpty();
                });
    }

    @Test
    void whenRatingEventSent_shouldRetryAndSucceed() {
        //Arrange
        MediaItem mediaItem = saveBasicMediaItem("someItem");
        User follower = saveUser("follower");
        UserFollow uf = new UserFollow();
        uf.setFollower(follower);
        uf.setFollowing(user);
        uf.setMinimumRatingThreshold((short) 9);
        userFollowRepository.save(uf);

        doThrow(new RuntimeException("Database connection failed"))
                .doThrow(new RuntimeException("Database connection failed"))
                .doCallRealMethod()
                .when(notificationService).createNotification(anyLong(), anyString(), anyLong(), anyShort(), anyLong());

        // Act
        sendRatingEvent(mediaItem, (short) 10);

        // Wait & Assert
        await()
                .atMost(15, TimeUnit.SECONDS)
                .pollInterval(100, TimeUnit.MILLISECONDS)
                .untilAsserted(() -> {
                    verify(ratingConsumer, times(3)).consumeRatingEvent(any(RatingEvent.class));
                    List<Notification> notifications = notificationRepository
                            .findByUserIdOrderByCreatedAtDesc(follower.getId(), Limit.of(3));
                    assertThat(notifications).hasSize(1);
                });
    }

    @Test
    void whenRatingEventSent_shouldCreateMultipleNotifications() {
        //Arrange
        MediaItem mediaItem1 = saveBasicMediaItem("someItem");
        MediaItem mediaItem2 = saveBasicMediaItem("someItem2");
        MediaItem mediaItem3 = saveBasicMediaItem("someItem3");
        User follower = saveUser("follower");
        UserFollow uf = new UserFollow();
        uf.setFollower(follower);
        uf.setFollowing(user);
        uf.setMinimumRatingThreshold((short) 9);
        userFollowRepository.save(uf);

        // Act
        sendRatingEvent(mediaItem1, (short) 10);
        sendRatingEvent(mediaItem2, (short) 9);
        sendRatingEvent(mediaItem3, (short) 8); //No notification

        // Wait & Assert
        await()
                .atMost(5, TimeUnit.SECONDS)
                .pollInterval(100, TimeUnit.MILLISECONDS)
                .untilAsserted(() -> {
                    List<Notification> notifications = notificationRepository
                            .findByUserIdOrderByCreatedAtDesc(follower.getId(), Limit.of(3));
                    assertThat(notifications).isNotEmpty();
                    assertEquals(2, notifications.size());
                    assertThat(notifications)
                            .extracting(Notification::getRating)
                            .contains((short) 10)
                            .contains((short) 9);
                });
    }

    @Test
    void whenRatingEventSent_shouldCreateNotification() {
        //Arrange
        MediaItem mediaItem = saveBasicMediaItem("someItem");
        User follower = saveUser("follower");
        UserFollow uf = new UserFollow();
        uf.setFollower(follower);
        uf.setFollowing(user);
        uf.setMinimumRatingThreshold((short) 10);
        userFollowRepository.save(uf);

        // Act
        sendRatingEvent(mediaItem, (short) 10);

        // Wait & Assert
        await()
                .atMost(5, TimeUnit.SECONDS)
                .pollInterval(100, TimeUnit.MILLISECONDS)
                .untilAsserted(() -> {
                    List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(follower.getId(), Limit.of(1));
                    assertThat(notifications).isNotEmpty();
                    assertThat(notifications.getFirst().getMessage())
                            .contains(user.getUsername())
                            .contains(mediaItem.getName());
                    assertThat(notifications.getFirst().getIsRead()).isFalse();
                });
    }

    @Test
    void whenRatingEventSent_avgRatingIsCalculatedProperly() {
        //Arrange
        MediaItem mediaItem = saveBasicMediaItem("someItem");
        saveMockUserRating(List.of(
                (short) 2,
                (short) 10,
                (short) 10
        ), mediaItem); //avg -> (2+10+10)/3 = 7.3

        // Act
        sendRatingEvent(mediaItem, null);

        // Wait & Assert
        await()
                .atMost(5, TimeUnit.SECONDS)
                .pollInterval(100, TimeUnit.MILLISECONDS)
                .untilAsserted(() -> {
                    MediaItem m = mediaItemRepository.findById(mediaItem.getId()).get();
                    assertEquals(BigDecimal.valueOf(7.3), m.getAvgRating());
                });
    }

    private void saveMockUserRating(List<Short> ratings, MediaItem mediaItem) {
        List<UserMediaList> userMediaLists = new ArrayList<>();
        for (int i = 0 ; i < ratings.size() ; ++i) {
            User user = saveUser("user" + i);
            userMediaLists.add(UserMediaList.builder()
                            .user(user)
                            .mediaItem(mediaItem)
                            .rating(ratings.get(i))
                    .build());
        }
        userMediaListRepository.saveAll(userMediaLists);
    }

    private void sendRatingEvent(MediaItem mediaItem, Short rating) {
        RatingEvent event = new RatingEvent();
        event.setUserId(user.getId());
        event.setMediaItemId(mediaItem.getId());
        event.setRating(rating);
        event.setUsername(user.getUsername());
        event.setMediaItemName(mediaItem.getName());

        sendKafkaMessage(event);
    }
}
