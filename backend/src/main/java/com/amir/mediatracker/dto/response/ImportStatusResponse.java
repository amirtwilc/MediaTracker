package com.amir.mediatracker.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ImportStatusResponse {
    private Long jobExecutionId;
    private String status;
    private LocalDateTime startTime;
}
