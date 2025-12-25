package com.amir.mediatracker.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class JobStatusResponse {
    private Long jobExecutionId;
    private String status;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Long readCount;
    private Long writeCount;
    private Long skipCount;
    private String exitCode;
    private String exitMessage;
}
