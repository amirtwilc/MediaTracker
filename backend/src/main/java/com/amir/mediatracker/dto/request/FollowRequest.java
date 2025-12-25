package com.amir.mediatracker.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Valid
public class FollowRequest {
    @NotNull(message = "User ID is required")
    private Long userId;

    @Min(0)
    @Max(10)
    private Short minimumRatingThreshold = 7;
}
