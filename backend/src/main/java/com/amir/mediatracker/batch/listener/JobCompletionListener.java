package com.amir.mediatracker.batch.listener;

import lombok.extern.slf4j.Slf4j;
import org.slf4j.LoggerFactory;
import org.springframework.batch.core.BatchStatus;
import org.springframework.batch.core.JobExecution;
import org.springframework.batch.core.JobExecutionListener;
import org.springframework.batch.core.StepExecution;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class JobCompletionListener implements JobExecutionListener {

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
