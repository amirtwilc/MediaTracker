package com.amir.mediatracker.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class UpdateMediaListRequest {
    private Boolean experienced;
    private Boolean wishToReexperience;

    @Min(0)
    @Max(10)
    private Short rating;
}
