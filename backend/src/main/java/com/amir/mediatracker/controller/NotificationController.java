package com.amir.mediatracker.controller;

import com.amir.mediatracker.dto.response.NotificationResponse;
import com.amir.mediatracker.entity.User;
import com.amir.mediatracker.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/media-tracker/notifications")
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    // Get user's notifications
    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getNotifications(
            @RequestParam(required = false, defaultValue = "false") boolean onlyUnread,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(
                notificationService.getNotifications(user.getId(), onlyUnread)
        );
    }

    // Mark notification as read
    @PutMapping("/{id}/read")
    public ResponseEntity<NotificationResponse> markAsRead(
            @PathVariable Long id,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(notificationService.markAsRead(user.getId(), id));
    }

    // Mark all notifications as read
    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        notificationService.markAllAsRead(user.getId());
        return ResponseEntity.noContent().build();
    }

    // Get unread count
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        long count = notificationService.getUnreadCount(user.getId());
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }
}
