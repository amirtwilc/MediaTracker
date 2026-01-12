package com.amir.mediatracker.batch.listener;

import com.amir.mediatracker.batch.dto.StepCount;
import com.amir.mediatracker.batch.util.BatchUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.BatchStatus;
import org.springframework.batch.core.JobExecution;
import org.springframework.batch.core.JobExecutionListener;
import org.springframework.stereotype.Component;

/**
 * Job listener for logging and monitoring
 */
@Slf4j
@Component
public class JobCompletionListener implements JobExecutionListener {

    @Override
    public void beforeJob(JobExecution jobExecution) {
        log.info(
                "Job {} started with status {}",
                jobExecution.getId(),
                jobExecution.getStatus()
        );
    }

    @Override
    public void afterJob(JobExecution jobExecution) {
        if (jobExecution.getStatus() == BatchStatus.COMPLETED) {
            StepCount stepCount = BatchUtil.countStepProperties(jobExecution);
            log.info("Job {} completed successfully! Read count: {}, Write count: {}, Skip count: {}",
                    jobExecution.getId(),
                    stepCount.getReadCount(),
                    stepCount.getWriteCount(),
                    stepCount.getSkipCount());
        } else {
            log.error("Job {} failed with status {} and exit status {}",
                    jobExecution.getId(),
                    jobExecution.getStatus(),
                    jobExecution.getExitStatus());

            jobExecution.getAllFailureExceptions()
                    .forEach(ex -> log.error("Job {} failure exception", jobExecution.getId(), ex));
        }
    }
}
