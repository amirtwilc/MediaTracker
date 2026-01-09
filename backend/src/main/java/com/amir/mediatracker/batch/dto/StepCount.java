package com.amir.mediatracker.batch.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class StepCount {
    long readCount;
    long writeCount;
    long skipCount;
}
