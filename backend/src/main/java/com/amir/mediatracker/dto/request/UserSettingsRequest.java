package com.amir.mediatracker.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UserSettingsRequest {
    @NotNull
    private Boolean isInvisible;

    @NotNull
    private Boolean showEmail;
}