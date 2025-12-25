package com.amir.mediatracker.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
@Valid
public class AddMediaRequest {
    @NotNull(message = "Media item ID is required")
    private Long mediaItemId;
}
