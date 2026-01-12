package com.amir.mediatracker.batch.util;

import com.amir.mediatracker.batch.dto.StepCount;
import lombok.experimental.UtilityClass;
import org.springframework.batch.core.JobExecution;
import org.springframework.batch.core.StepExecution;

@UtilityClass
public class BatchUtil {

    /**
     * Counts the read, writes and skips of a given job
     * @param jobExecution The job execution instance
     * @return StepCount
     */
    public StepCount countStepProperties(JobExecution jobExecution) {
        long readCount = 0;
        long writeCount = 0;
        long skipCount = 0;

        for (StepExecution stepExecution : jobExecution.getStepExecutions()) {
            readCount += stepExecution.getReadCount();
            writeCount += stepExecution.getWriteCount();
            skipCount += stepExecution.getSkipCount();
        }

        return StepCount.builder()
                .readCount(readCount)
                .writeCount(writeCount)
                .skipCount(skipCount)
                .build();
    }
}
