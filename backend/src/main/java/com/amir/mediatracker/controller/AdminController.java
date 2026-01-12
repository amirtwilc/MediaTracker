package com.amir.mediatracker.controller;

import com.amir.mediatracker.aop.LogAround;
import com.amir.mediatracker.batch.constant.JobParameterNames;
import com.amir.mediatracker.dto.request.GenreRequest;
import com.amir.mediatracker.dto.request.MediaItemRequest;
import com.amir.mediatracker.dto.request.PlatformRequest;
import com.amir.mediatracker.dto.response.*;
import com.amir.mediatracker.exception.BadRequestException;
import com.amir.mediatracker.service.AdminService;
import com.amir.mediatracker.service.AsyncBatchService;
import com.amir.mediatracker.service.FileStorageService;
import io.micrometer.common.util.StringUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.batch.core.JobParameters;
import org.springframework.batch.core.JobParametersBuilder;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@LogAround
@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final AsyncBatchService asyncBatchService;
    private final FileStorageService fileStorageService;

    /**
     * Handles upload of CSV file and activated Spring Batch.
     * Job is performed asynchronously for non-blocking behavior.
     * A unique correlationId key is generated and will be mapped later to a jobExecutionId
     * @param file The CSV file to parse
     * @return correlationId and status
     * @throws IOException if file was not able to be temporarily saved to system
     */
    @PostMapping("/media-items/import-csv")
    public ResponseEntity<ImportStatusResponse> importCsv(
            @RequestParam("file") MultipartFile file) throws IOException {

        if (file.isEmpty()) {
            throw new BadRequestException("Uploaded file is empty");
        }

        if (StringUtils.isBlank(file.getOriginalFilename()) ||
                !file.getOriginalFilename().toLowerCase().endsWith(".csv")) {
            throw new BadRequestException("Only CSV files are supported");
        }

        String tempFilePath = fileStorageService.storeTempFile(file);

        long correlationId = System.currentTimeMillis();

        JobParameters params = new JobParametersBuilder()
                .addString(JobParameterNames.FILE_PATH, tempFilePath)
                .toJobParameters();

        asyncBatchService.startImportJob(correlationId, params);

        return ResponseEntity.ok(
                ImportStatusResponse.builder()
                        .correlationId(correlationId)
                        .status("STARTING")
                        .build()
        );
    }

    /**
     * Checks the status of a started job
     * @param correlationId The key given by /import-csv endpoint
     * @return The job current status, along with the amount of reads, writes and skips performed
     */
    @GetMapping("/media-items/import-status/{correlationId}")
    public ResponseEntity<JobStatusResponse> getJobStatus(
            @PathVariable Long correlationId) {
        return ResponseEntity.ok(adminService.getJobStatus(correlationId));
    }

    // Get all genres
    @GetMapping("/genres")
    public ResponseEntity<List<GenreResponse>> getAllGenres() {
        return ResponseEntity.ok(adminService.getAllGenres());
    }

    // Get all platforms
    @GetMapping("/platforms")
    public ResponseEntity<List<PlatformResponse>> getAllPlatforms() {
        return ResponseEntity.ok(adminService.getAllPlatforms());
    }

    // Create genre
    @PostMapping("/genres")
    public ResponseEntity<GenreResponse> createGenre(@RequestBody @Valid GenreRequest request) {
        return ResponseEntity.ok(adminService.createGenre(request));
    }

    // Create platform
    @PostMapping("/platforms")
    public ResponseEntity<PlatformResponse> createPlatform(@RequestBody @Valid PlatformRequest request) {
        return ResponseEntity.ok(adminService.createPlatform(request));
    }

    // Create media item
    @PostMapping("/media-items")
    public ResponseEntity<MediaItemResponse> createMediaItem(
            @RequestBody @Valid MediaItemRequest request) {
        return ResponseEntity.ok(adminService.createMediaItem(request));
    }

    // Update media item
    @PutMapping("/media-items/{id}")
    public ResponseEntity<MediaItemResponse> updateMediaItem(
            @PathVariable Long id,
            @RequestBody @Valid MediaItemRequest request) {
        return ResponseEntity.ok(adminService.updateMediaItem(id, request));
    }

    // Delete media item
    @DeleteMapping("/media-items/{id}")
    public ResponseEntity<Void> deleteMediaItem(@PathVariable Long id) {
        adminService.deleteMediaItem(id);
        return ResponseEntity.noContent().build();
    }

    // Get all media items (paginated)
    @GetMapping("/media-items")
    public ResponseEntity<Page<MediaItemResponse>> getAllMediaItems(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(adminService.getAllMediaItems(page, size));
    }
}