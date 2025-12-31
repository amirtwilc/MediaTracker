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
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class AsyncBatchService {

    private final JobLauncher jobLauncher;
    private final Job importMediaItemJob;

    // Store job executions for tracking
    private final Map<Long, JobExecution> jobExecutions = new ConcurrentHashMap<>();
    
    // Store mapping from startTime (timestamp) to job execution ID
    private final Map<Long, Long> startTimeToJobId = new ConcurrentHashMap<>();

    @Async
    public CompletableFuture<JobExecution> runImportJob(JobParameters jobParameters) {
        try {
            log.info("Starting async batch job execution");
            Long startTime = jobParameters.getLong("startTime");
            
            // jobLauncher.run() returns immediately with a JobExecution that's persisted
            // The job runs asynchronously, so we can store the execution right away
            JobExecution execution = jobLauncher.run(importMediaItemJob, jobParameters);
            
            // Store execution immediately so it can be queried while running
            jobExecutions.put(execution.getId(), execution);
            
            // Store mapping from startTime to job execution ID immediately
            if (startTime != null) {
                startTimeToJobId.put(startTime, execution.getId());
                log.info("Mapped startTime {} to job execution ID {} (job status: {})", 
                    startTime, execution.getId(), execution.getStatus());
            }
            
            // Wait for job to complete (this happens asynchronously)
            // The JobExecution object will be updated as the job progresses
            log.info("Batch job execution started with ID: {}, status: {}", 
                execution.getId(), execution.getStatus());
            
            return CompletableFuture.completedFuture(execution);
        } catch (Exception e) {
            log.error("Failed to run batch job", e);
            return CompletableFuture.failedFuture(e);
        }
    }

    public JobExecution getJobExecution(Long jobId) {
        return jobExecutions.get(jobId);
    }
    
    public Long getJobExecutionIdByStartTime(Long startTime) {
        return startTimeToJobId.get(startTime);
    }
    
    public void storeJobMapping(Long startTime, Long jobExecutionId) {
        if (startTime == null) {
            log.warn("Attempted to store job mapping with null startTime");
            return;
        }
        if (jobExecutionId == null) {
            log.warn("Attempted to store job mapping with null jobExecutionId for startTime: {}", startTime);
            return;
        }
        
        startTimeToJobId.put(startTime, jobExecutionId);
        // Only put the execution if it's not already present to avoid overwriting a real execution with null
        if (!jobExecutions.containsKey(jobExecutionId)) {
            jobExecutions.put(jobExecutionId, null); // Placeholder, will be updated by JobExplorer
        }
        log.info("Stored mapping: startTime {} -> jobExecutionId {}", startTime, jobExecutionId);
    }
}