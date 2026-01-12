package com.amir.mediatracker.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.JobExecution;
import org.springframework.batch.core.JobParameters;
import org.springframework.batch.core.launch.JobLauncher;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class AsyncBatchService {

    private final JobLauncher jobLauncher;
    private final Job importMediaItemJob;

    private final Map<Long, Long> correlationToExecution =
            new ConcurrentHashMap<>();

    /**
     * Asynchronously running import job.
     * Once jobExecutionId is generated, mapping it to correlationId.
     * @param correlationId The key given to the client. Will be mapped to the jobExecutionId for future fetching
     * @param params The parameters the job requires to work
     */
    @Async
    public void startImportJob(Long correlationId, JobParameters params) {
        try {
            JobExecution execution =
                    jobLauncher.run(importMediaItemJob, params);

            correlationToExecution.put(correlationId, execution.getId());

            log.info(
                    "Started import job. correlationId={} jobExecutionId={}",
                    correlationId,
                    execution.getId()
            );
        } catch (Exception ex) {
            log.error("Failed to start import job with correlationId={}", correlationId, ex);
        }
    }

    /**
     * Extract jobExecutionId by correlationId
     * @param correlationId The key to jobExecutionId
     * @return jobExecutionId
     */
    public Long resolveJobExecutionId(Long correlationId) {
        return correlationToExecution.get(correlationId);
    }
}
