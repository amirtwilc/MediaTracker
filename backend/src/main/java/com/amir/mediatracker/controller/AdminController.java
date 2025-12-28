package com.amir.mediatracker.controller;

import com.amir.mediatracker.aop.LogAround;
import com.amir.mediatracker.dto.request.GenreRequest;
import com.amir.mediatracker.dto.request.MediaItemRequest;
import com.amir.mediatracker.dto.request.PlatformRequest;
import com.amir.mediatracker.dto.response.*;
import com.amir.mediatracker.service.AdminService;
import jakarta.validation.Valid;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.JobExecution;
import org.springframework.batch.core.JobParameters;
import org.springframework.batch.core.JobParametersBuilder;
import org.springframework.batch.core.launch.JobLauncher;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@RestController
@RequestMapping("/media-tracker/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    @Autowired
    private AdminService adminService;

    @Autowired
    private JobLauncher jobLauncher;

    @Autowired
    private Job importMediaItemJob;

    // Upload CSV and trigger Spring Batch job
    @LogAround
    @PostMapping("/media-items/import-csv")
    public ResponseEntity<ImportStatusResponse> importCSV(
            @RequestParam("file") MultipartFile file) throws Exception {

        // Save file temporarily
        String tempFilePath = saveTempFile(file);

        // Launch batch job
        JobParameters jobParameters = new JobParametersBuilder()
                .addString("filePath", tempFilePath)
                .addLong("startTime", System.currentTimeMillis())
                .toJobParameters();

        JobExecution execution = jobLauncher.run(importMediaItemJob, jobParameters);

        ImportStatusResponse response = new ImportStatusResponse();
        response.setJobExecutionId(execution.getId());
        response.setStatus(execution.getStatus().toString());
        response.setStartTime(execution.getStartTime());

        return ResponseEntity.ok(response);
    }

    // Check batch job status
    @LogAround
    @GetMapping("/media-items/import-status/{jobExecutionId}")
    public ResponseEntity<JobStatusResponse> getJobStatus(
            @PathVariable Long jobExecutionId) {
        return ResponseEntity.ok(adminService.getJobStatus(jobExecutionId));
    }

    // Get all genres
    @LogAround
    @GetMapping("/genres")
    public ResponseEntity<List<GenreResponse>> getAllGenres() {
        return ResponseEntity.ok(adminService.getAllGenres());
    }

    // Get all platforms
    @LogAround
    @GetMapping("/platforms")
    public ResponseEntity<List<PlatformResponse>> getAllPlatforms() {
        return ResponseEntity.ok(adminService.getAllPlatforms());
    }

    // Create genre
    @LogAround
    @PostMapping("/genres")
    public ResponseEntity<GenreResponse> createGenre(@RequestBody @Valid GenreRequest request) {
        return ResponseEntity.ok(adminService.createGenre(request));
    }

    // Create platform
    @LogAround
    @PostMapping("/platforms")
    public ResponseEntity<PlatformResponse> createPlatform(@RequestBody @Valid PlatformRequest request) {
        return ResponseEntity.ok(adminService.createPlatform(request));
    }

    // Create media item
    @LogAround
    @PostMapping("/media-items")
    public ResponseEntity<MediaItemResponse> createMediaItem(
            @RequestBody @Valid MediaItemRequest request) {
        return ResponseEntity.ok(adminService.createMediaItem(request));
    }

    // Update media item
    @LogAround
    @PutMapping("/media-items/{id}")
    public ResponseEntity<MediaItemResponse> updateMediaItem(
            @PathVariable Long id,
            @RequestBody @Valid MediaItemRequest request) {
        return ResponseEntity.ok(adminService.updateMediaItem(id, request));
    }

    // Delete media item
    @LogAround
    @DeleteMapping("/media-items/{id}")
    public ResponseEntity<Void> deleteMediaItem(@PathVariable Long id) {
        adminService.deleteMediaItem(id);
        return ResponseEntity.noContent().build();
    }

    // Get all media items (paginated)
    @LogAround
    @GetMapping("/media-items")
    public ResponseEntity<Page<MediaItemResponse>> getAllMediaItems(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(adminService.getAllMediaItems(page, size));
    }

    private String saveTempFile(MultipartFile file) throws IOException {
        String tempDir = System.getProperty("java.io.tmpdir");
        String fileName = "upload_" + System.currentTimeMillis() + "_" + file.getOriginalFilename();
        Path filePath = Paths.get(tempDir, fileName);
        Files.write(filePath, file.getBytes());
        return filePath.toString();
    }
}