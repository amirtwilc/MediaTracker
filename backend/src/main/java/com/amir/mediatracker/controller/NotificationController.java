package com.amir.mediatracker.controller;

import com.amir.mediatracker.dto.response.NotificationResponse;
import com.amir.mediatracker.security.dto.UserPrincipal;
import com.amir.mediatracker.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/notifications")
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * Fetch user's latest notifications. If onlyUnread is true, only unread notifications are returned.
     * @param onlyUnread Whether all notifications are required, or only unread
     * @param userPrincipal The user principal
     * @return List of notifications
     */
    @GetMapping
    public List<NotificationResponse> getNotifications(
            @RequestParam(required = false, defaultValue = "false") boolean onlyUnread,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Long userId = userPrincipal.getId();
        return notificationService.getNotifications(userId, onlyUnread);
    }

    /**
     * Mark a notification as read
     * @param id The id of the notification to mark as read
     * @param userPrincipal The user principal
     * @return The notification that was marked as read
     */
    @PutMapping("/{id}/read")
    public NotificationResponse markAsRead(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Long userId = userPrincipal.getId();
        return notificationService.markAsRead(userId, id);
    }

    /**
     * Mark all visible notifications as read
     * @param userPrincipal The user principal
     */
    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        Long userId = userPrincipal.getId();
        notificationService.markAllAsRead(userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Get the count of unread notifications
     * @param userPrincipal The user principal
     * @return The count of unread notifications
     */
    @GetMapping("/unread-count")
    public Map<String, Long> getUnreadCount(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Long userId = userPrincipal.getId();
        long count = notificationService.getUnreadCount(userId);
        return Map.of("unreadCount", count);
    }
}
