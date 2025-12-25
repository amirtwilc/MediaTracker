package com.amir.mediatracker.service;

import com.amir.mediatracker.dto.response.*;
import com.amir.mediatracker.entity.*;
import com.amir.mediatracker.exception.ResourceNotFoundException;
import com.amir.mediatracker.repository.MediaItemRepository;
import com.amir.mediatracker.repository.NotificationRepository;
import com.amir.mediatracker.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.weaver.ast.Not;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Slf4j
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MediaItemRepository mediaItemRepository;

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

    public List<NotificationResponse> getNotifications(Long userId, boolean onlyUnread) {
        List<Notification> notifications;

        if (onlyUnread) {
            notifications = notificationRepository.findByUserIdAndIsReadFalse(userId);
        } else {
            notifications = notificationRepository.findByUserId(userId);
        }

        return notifications.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public NotificationResponse markAsRead(Long userId, Long notificationId) {
        Notification notification = notificationRepository
                .findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));

        notification.setIsRead(true);
        Notification saved = notificationRepository.save(notification);
        return mapToResponse(saved);
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        List<Notification> notifications = notificationRepository
                .findByUserIdAndIsReadFalse(userId);

        notifications.forEach(n -> n.setIsRead(true));
        notificationRepository.saveAll(notifications);
    }

    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
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
