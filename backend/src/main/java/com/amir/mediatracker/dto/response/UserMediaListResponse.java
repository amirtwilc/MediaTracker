package com.amir.mediatracker.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class UserMediaListResponse {
    private Long id;
    private MediaItemResponse mediaItem;
    private Boolean experienced;
    private Boolean wishToReexperience;
    private Short rating;
    private LocalDateTime addedAt;
    private LocalDateTime updatedAt;
}
