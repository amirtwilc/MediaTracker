package com.amir.mediatracker.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Valid
public class PlatformRequest {
    @NotBlank(message = "Platform name is required")
    @Size(max = 100)
    private String name;
}
