package com.amir.mediatracker.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserSettingsResponse {
    private Boolean isInvisible;
    private Boolean showEmail;
}