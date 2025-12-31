package com.amir.mediatracker.batch.listener;

import com.amir.mediatracker.service.AsyncBatchService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.BatchStatus;
import org.springframework.batch.core.JobExecution;
import org.springframework.batch.core.JobExecutionListener;
import org.springframework.batch.core.StepExecution;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class JobCompletionListener implements JobExecutionListener {

    private final AsyncBatchService asyncBatchService;

    @Autowired
    public JobCompletionListener(@Lazy AsyncBatchService asyncBatchService) {
        this.asyncBatchService = asyncBatchService;
    }

    @Override
    public void beforeJob(JobExecution jobExecution) {
        // Store the mapping immediately when job starts (before processing begins)
        // This ensures the job execution ID is available for status queries right away
        Long startTime = jobExecution.getJobParameters().getLong("startTime");
        if (startTime != null) {
            asyncBatchService.storeJobMapping(startTime, jobExecution.getId());
            log.info("Job started - mapped startTime {} to job execution ID {} (status: {})", 
                startTime, jobExecution.getId(), jobExecution.getStatus());
        }
    }

    @Override
    public void afterJob(JobExecution jobExecution) {
        if (jobExecution.getStatus() == BatchStatus.COMPLETED) {
            log.info("Job completed successfully!");
            log.info("Read count: {}", jobExecution.getStepExecutions().stream()
                    .mapToLong(StepExecution::getReadCount).sum());
            log.info("Write count: {}", jobExecution.getStepExecutions().stream()
                    .mapToLong(StepExecution::getWriteCount).sum());
            log.info("Skip count: {}", jobExecution.getStepExecutions().stream()
                    .mapToLong(StepExecution::getSkipCount).sum());
        } else if (jobExecution.getStatus() == BatchStatus.FAILED) {
            log.error("Job failed!");
        }
    }
}
