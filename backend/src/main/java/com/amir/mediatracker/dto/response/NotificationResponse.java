package com.amir.mediatracker.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class NotificationResponse {
    private Long id;
    private String message;
    private MediaItemResponse mediaItem;
    private Short rating;
    private UserResponse ratedByUser;
    private Boolean isRead;
    private LocalDateTime createdAt;
}
