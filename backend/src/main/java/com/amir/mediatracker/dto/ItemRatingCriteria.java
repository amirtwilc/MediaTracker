package com.amir.mediatracker.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ItemRatingCriteria(
        @NotNull
        Long mediaItemId,
        @Min(0)
        @Max(10)
        int minRating,
        @Min(0)
        @Max(10)
        int maxRating
) {
    @AssertTrue(message = "minRating must be <= maxRating")
    boolean isValidRange() {
        return minRating <= maxRating;
    }
}
