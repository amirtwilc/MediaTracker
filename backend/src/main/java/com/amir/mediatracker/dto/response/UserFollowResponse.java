package com.amir.mediatracker.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class UserFollowResponse {
    private Long id;
    private UserResponse user;
    private Short minimumRatingThreshold;
    private LocalDateTime createdAt;
}
