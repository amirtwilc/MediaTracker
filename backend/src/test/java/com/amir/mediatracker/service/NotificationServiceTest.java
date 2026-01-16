package com.amir.mediatracker.service;

import com.amir.mediatracker.dto.response.NotificationResponse;
import com.amir.mediatracker.entity.Notification;
import com.amir.mediatracker.exception.ResourceNotFoundException;
import com.amir.mediatracker.repository.MediaItemRepository;
import com.amir.mediatracker.repository.NotificationRepository;
import com.amir.mediatracker.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Limit;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private MediaItemRepository mediaItemRepository;

    @InjectMocks
    private NotificationService notificationService;

    @BeforeEach
    void setup() {
        ReflectionTestUtils.setField(notificationService, "fetchLimit", 10);
    }

    @Test
    void getUnreadCount_countsUnreadWithinLimit() {
        Long userId = 1L;

        List<Notification> notifications = List.of(
                notification(1L, false, LocalDateTime.now()),
                notification(2L, true, LocalDateTime.now()),
                notification(3L, false, LocalDateTime.now())
        );

        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(eq(userId), any(Limit.class)))
                .thenReturn(notifications);

        long count = notificationService.getUnreadCount(userId);

        assertThat(count).isEqualTo(2);
    }

    @Test
    void markAllAsRead_marksAllFetchedUnreadNotifications() {
        Long userId = 1L;

        Notification n1 = notification(1L, false, LocalDateTime.now());
        Notification n2 = notification(2L, false, LocalDateTime.now().minusMinutes(1));

        when(notificationRepository
                .findByUserIdAndIsReadFalseOrderByCreatedAtDesc(eq(userId), any(Limit.class)))
                .thenReturn(List.of(n1, n2));

        notificationService.markAllAsRead(userId);

        assertThat(n1.getIsRead()).isTrue();
        assertThat(n2.getIsRead()).isTrue();
    }


    @Test
    void markAsRead_throwsWhenNotFound() {
        when(notificationRepository.findByIdAndUserId(anyLong(), anyLong()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                notificationService.markAsRead(1L, 99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void markAsRead_marksNotificationAsRead() {
        Long userId = 1L;
        Long notificationId = 10L;

        Notification notification = notification(notificationId, false, LocalDateTime.now());

        when(notificationRepository.findByIdAndUserId(notificationId, userId))
                .thenReturn(Optional.of(notification));

        NotificationResponse response =
                notificationService.markAsRead(userId, notificationId);

        assertThat(response.getIsRead()).isTrue();
    }

    @Test
    void getNotifications_returnsNone_whenOnlyUnreadTrue() {
        Long userId = 1L;

        List<Notification> notifications = List.of(
                notification(1L, true, LocalDateTime.now()),
                notification(2L, true, LocalDateTime.now().minusMinutes(1)),
                notification(3L, true, LocalDateTime.now().minusMinutes(2)),
                notification(4L, true, LocalDateTime.now().minusMinutes(3))
        );

        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(eq(userId), any(Limit.class)))
                .thenReturn(notifications);

        List<NotificationResponse> result =
                notificationService.getNotifications(userId, true);

        assertThat(result).hasSize(0);
    }

    @Test
    void getNotifications_returnsOnlyUnread_whenOnlyUnreadTrue() {
        Long userId = 1L;

        List<Notification> notifications = List.of(
                notification(1L, true, LocalDateTime.now()),
                notification(2L, false, LocalDateTime.now().minusMinutes(1)),
                notification(3L, true, LocalDateTime.now().minusMinutes(2)),
                notification(4L, false, LocalDateTime.now().minusMinutes(3))
        );

        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(eq(userId), any(Limit.class)))
                .thenReturn(notifications);

        List<NotificationResponse> result =
                notificationService.getNotifications(userId, true);

        assertThat(result).hasSize(2);
        assertThat(result.getFirst().getIsRead()).isFalse();
        assertThat(result.getLast().getIsRead()).isFalse();
    }

    @Test
    void getNotifications_returnsAllWithinLimit_whenOnlyUnreadFalse() {
        Long userId = 1L;

        List<Notification> notifications = List.of(
                notification(1L, false, LocalDateTime.now()),
                notification(2L, true, LocalDateTime.now().minusMinutes(1))
        );

        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(eq(userId), any(Limit.class)))
                .thenReturn(notifications);

        List<NotificationResponse> result =
                notificationService.getNotifications(userId, false);

        assertThat(result).hasSize(2);
    }


    private Notification notification(Long id, boolean isRead, LocalDateTime createdAt) {
        Notification n = new Notification();
        n.setId(id);
        n.setIsRead(isRead);
        n.setCreatedAt(createdAt);
        n.setMessage("msg-" + id);
        return n;
    }
}
