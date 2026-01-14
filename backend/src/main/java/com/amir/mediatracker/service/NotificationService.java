package com.amir.mediatracker.service;

import com.amir.mediatracker.dto.response.*;
import com.amir.mediatracker.entity.*;
import com.amir.mediatracker.exception.ResourceNotFoundException;
import com.amir.mediatracker.repository.MediaItemRepository;
import com.amir.mediatracker.repository.NotificationRepository;
import com.amir.mediatracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.weaver.ast.Not;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    @Value("${app.notification.fetch-limit}")
    private int fetchLimit;

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final MediaItemRepository mediaItemRepository;

    /**
     * Create a notification for a user
     * @param userId The id of the user that will see this notification
     * @param message The message displayed as part of this notification
     * @param mediaItemId The media item id for which this notification was created
     * @param rating The rating That caused this notification
     * @param ratedByUserId The id of the user that rated the media item
     */
    @Transactional
    public void createNotification(Long userId, String message,
                                   Long mediaItemId, Short rating, Long ratedByUserId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        MediaItem mediaItem = mediaItemId != null
                ? mediaItemRepository.findById(mediaItemId).orElse(null)
                : null;

        User ratedByUser = ratedByUserId != null
                ? userRepository.findById(ratedByUserId).orElse(null)
                : null;

        Notification notification = new Notification();
        notification.setUser(user);
        notification.setMessage(message);
        notification.setMediaItem(mediaItem);
        notification.setRating(rating);
        notification.setRatedByUser(ratedByUser);
        notification.setIsRead(false);

        notificationRepository.save(notification);
        log.info("Created notification for user {}: {}", userId, message);
    }

    /**
     * Get notifications for a user, up to a default limit.
     * Fetching notifications and then filtering unread, so to not fetch unread notification that are beyond the limit.
     * For example: limit is 10, and there are 20 notifications. All recent 10 notifications are read, and 10 are unread.
     * In this case, if onlyUnread is true, no notifications will be returned.
     * @param userId The id of the user for whom to fetch notification
     * @param onlyUnread Whether all notifications are required, or only unread
     * @return All notifications for the user, up to the default limit
     */
    public List<NotificationResponse> getNotifications(Long userId, boolean onlyUnread) {

        List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, Limit.of(fetchLimit));
        if (onlyUnread) {
            notifications = notifications.stream()
                    .filter(n -> !n.getIsRead())
                    .toList();
        }

        return notifications.stream()
                .map(this::mapToResponse)
                .toList();
    }

    /**
     * Mark a notification as read
     * @param userId The id of the user for whom to fetch notification
     * @param notificationId The id of the notification to fetch
     * @return The notification that was marked as read
     */
    @Transactional
    public NotificationResponse markAsRead(Long userId, Long notificationId) {
        Notification notification = notificationRepository
                .findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));

        notification.setIsRead(true);
        return mapToResponse(notification);
    }

    /**
     * Mark all visible notifications as read.
     * Since only latest notifications are visible (up to limit), only those are marked as read.
     * @param userId The id of the user for whom to fetch notification
     */
    @Transactional
    public void markAllAsRead(Long userId) {
        List<Notification> notifications = notificationRepository
                .findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId, Limit.of(fetchLimit));

        notifications.forEach(n -> n.setIsRead(true));
    }

    /**
     * Fetch the count of all unread notifications, up to the default limit
     * @param userId The id of the user for whom to fetch notification
     * @return The count of unread notifications
     */
    public long getUnreadCount(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, Limit.of(fetchLimit))
                .stream()
                .filter(n -> !n.getIsRead())
                .count();
    }

    private NotificationResponse mapToResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .message(notification.getMessage())
                .mediaItem(notification.getMediaItem() != null
                        ? mapMediaItemToResponse(notification.getMediaItem())
                        : null)
                .rating(notification.getRating())
                .ratedByUser(notification.getRatedByUser() != null
                        ? mapUserToResponse(notification.getRatedByUser())
                        : null)
                .isRead(notification.getIsRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }

    private MediaItemResponse mapMediaItemToResponse(MediaItem item) {
        return MediaItemResponse.builder()
                .id(item.getId())
                .category(item.getCategory())
                .name(item.getName())
                .year(item.getYear())
                .avgRating(item.getAvgRating())
                .genres(mapGenreSetToResponse(item.getGenres()))
                .platforms(mapPlatformSetToResponse(item.getPlatforms()))
                .build();
    }

    private UserResponse mapUserToResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .build();
    }

    private Set<GenreResponse> mapGenreSetToResponse(Set<Genre> genres) {
        Set<GenreResponse> response = new HashSet<>();
        for (Genre genre: genres) {
            response.add(GenreResponse.builder()
                            .id(genre.getId())
                            .name(genre.getName())
                    .build());
        }
        return response;
    }

    private Set<PlatformResponse> mapPlatformSetToResponse(Set<Platform> platforms) {
        Set<PlatformResponse> response = new HashSet<>();
        for (Platform platform: platforms) {
            response.add(PlatformResponse.builder()
                    .id(platform.getId())
                    .name(platform.getName())
                    .build());
        }
        return response;
    }
}
