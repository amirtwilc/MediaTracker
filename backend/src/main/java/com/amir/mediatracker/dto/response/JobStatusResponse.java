package com.amir.mediatracker.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class JobStatusResponse {
    private Long correlationId;
    private Long jobExecutionId;
    private String status;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private long readCount;
    private long writeCount;
    private long skipCount;
    private String exitCode;
    private String exitMessage;
}
