package com.amir.mediatracker.controller;

import com.amir.mediatracker.aop.LogAround;
import com.amir.mediatracker.dto.response.NotificationResponse;
import com.amir.mediatracker.entity.User;
import com.amir.mediatracker.security.dto.UserPrincipal;
import com.amir.mediatracker.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
    @LogAround
    public ResponseEntity<List<NotificationResponse>> getNotifications(
            @RequestParam(required = false, defaultValue = "false") boolean onlyUnread,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Long userId = userPrincipal.getId();
        return ResponseEntity.ok(
                notificationService.getNotifications(userId, onlyUnread)
        );
    }

    // Mark notification as read
    @PutMapping("/{id}/read")
    @LogAround
    public ResponseEntity<NotificationResponse> markAsRead(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Long userId = userPrincipal.getId();
        return ResponseEntity.ok(notificationService.markAsRead(userId, id));
    }

    // Mark all notifications as read
    @PutMapping("/read-all")
    @LogAround
    public ResponseEntity<Void> markAllAsRead(Authentication authentication,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Long userId = userPrincipal.getId();
        notificationService.markAllAsRead(userId);
        return ResponseEntity.noContent().build();
    }

    // Get unread count
    @GetMapping("/unread-count")
    @LogAround
    public ResponseEntity<Map<String, Long>> getUnreadCount(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Long userId = userPrincipal.getId();
        long count = notificationService.getUnreadCount(userId);
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }
}
