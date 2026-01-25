package com.amir.mediatracker.service;

import com.amir.mediatracker.batch.dto.StepCount;
import com.amir.mediatracker.batch.util.BatchUtil;
import com.amir.mediatracker.dto.request.GenreRequest;
import com.amir.mediatracker.dto.request.MediaItemRequest;
import com.amir.mediatracker.dto.request.PlatformRequest;
import com.amir.mediatracker.dto.response.GenreResponse;
import com.amir.mediatracker.dto.response.JobStatusResponse;
import com.amir.mediatracker.dto.response.MediaItemResponse;
import com.amir.mediatracker.dto.response.PlatformResponse;
import com.amir.mediatracker.entity.Genre;
import com.amir.mediatracker.entity.MediaItem;
import com.amir.mediatracker.entity.Platform;
import com.amir.mediatracker.exception.ConflictException;
import com.amir.mediatracker.exception.DuplicateResourceException;
import com.amir.mediatracker.exception.ResourceNotFoundException;
import com.amir.mediatracker.repository.GenreRepository;
import com.amir.mediatracker.repository.MediaItemRepository;
import com.amir.mediatracker.repository.PlatformRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.BatchStatus;
import org.springframework.batch.core.JobExecution;
import org.springframework.batch.core.explore.JobExplorer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class AdminService {

    private final MediaItemRepository mediaItemRepository;

    private final GenreRepository genreRepository;

    private final PlatformRepository platformRepository;

    private final JobExplorer jobExplorer;
    
    private final AsyncBatchService asyncBatchService;

    public List<GenreResponse> getAllGenres() {
        return genreRepository.findAll().stream()
                .map(this::mapGenreToResponse)
                .toList();
    }

    public List<PlatformResponse> getAllPlatforms() {
        return platformRepository.findAll().stream()
                .map(this::mapPlatformToResponse)
                .toList();
    }

    @Transactional
    public GenreResponse createGenre(GenreRequest request) {
        if (genreRepository.findByNameIgnoreCase(request.getName()).isPresent()) {
            throw new DuplicateResourceException("Genre already exists");
        }

        Genre genre = new Genre();
        genre.setName(request.getName());
        Genre saved = genreRepository.save(genre);
        return mapGenreToResponse(saved);
    }

    @Transactional
    public PlatformResponse createPlatform(PlatformRequest request) {
        if (platformRepository.findByNameIgnoreCase(request.getName()).isPresent()) {
            throw new DuplicateResourceException("Platform already exists");
        }

        Platform platform = new Platform();
        platform.setName(request.getName());
        Platform saved = platformRepository.save(platform);
        return mapPlatformToResponse(saved);
    }

    @Transactional
    public MediaItemResponse createMediaItem(MediaItemRequest request) {
        Optional<MediaItem> existing = mediaItemRepository
                .findByNameAndCategory(request.getName(), request.getCategory());

        if (existing.isPresent()) {
            throw new DuplicateResourceException(
                    "Media item with this name and category already exists");
        }

        MediaItem item = new MediaItem();
        applyRequestToEntity(item, request);

        return mapToResponse(mediaItemRepository.save(item));
    }

    @Transactional
    public MediaItemResponse updateMediaItem(Long id, MediaItemRequest request) {
        MediaItem item = mediaItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Media item not found"));

        if (!item.getName().equalsIgnoreCase(request.getName())
                || !item.getCategory().equals(request.getCategory())) {
            throw new ConflictException("Request media item does not correlate to existing media item by id");
        }

        applyRequestToEntity(item, request);
        return mapToResponse(mediaItemRepository.save(item));
    }

    @Transactional
    public void deleteMediaItem(Long id) {
        if (!mediaItemRepository.existsById(id)) {
            throw new ResourceNotFoundException("Media item not found");
        }
        mediaItemRepository.deleteById(id);
    }

    /**
     * Retrieves the current job status, along with the amount of reads, writes and skips performed
     * @param correlationId The key that maps to the jobExecutionId
     * @return The complete job status
     */
    public JobStatusResponse getJobStatus(Long correlationId) {

        Long jobExecutionId = asyncBatchService.resolveJobExecutionId(correlationId);

        //Assuming status was requested too fast, before jobExecutionId was generated and mapped
        if (jobExecutionId == null) {
            log.warn("getJobStatus() was called with correlationId={}, but no map to jobExecutionId was found", correlationId);
            return JobStatusResponse.builder()
                    .correlationId(correlationId)
                    .status(BatchStatus.STARTING.toString())
                    .build();
        }

        JobExecution execution = jobExplorer.getJobExecution(jobExecutionId);
        if (execution == null) {
            throw new ResourceNotFoundException(
                    "Job execution not found for correlationId " + correlationId
            );
        }

        StepCount stepCount = BatchUtil.countStepProperties(execution);

        return JobStatusResponse.builder()
                .correlationId(correlationId)
                .jobExecutionId(jobExecutionId)
                .status(execution.getStatus().toString())
                .startTime(execution.getStartTime())
                .endTime(execution.getEndTime())
                .readCount(stepCount.getReadCount())
                .writeCount(stepCount.getWriteCount())
                .skipCount(stepCount.getSkipCount())
                .exitCode(execution.getExitStatus().getExitCode())
                .exitMessage(execution.getExitStatus().getExitDescription())
                .build();
    }

    private MediaItemResponse mapToResponse(MediaItem item) {
        return MediaItemResponse.builder()
                .id(item.getId())
                .category(item.getCategory())
                .name(item.getName())
                .year(item.getYear())
                .avgRating(item.getAvgRating())
                .genres(item.getGenres().stream()
                        .map(this::mapGenreToResponse)
                        .collect(Collectors.toSet()))
                .platforms(item.getPlatforms().stream()
                        .map(this::mapPlatformToResponse)
                        .collect(Collectors.toSet()))
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .build();
    }

    private GenreResponse mapGenreToResponse(Genre genre) {
        return GenreResponse.builder()
                .id(genre.getId())
                .name(genre.getName())
                .build();
    }

    private PlatformResponse mapPlatformToResponse(Platform platform) {
        return PlatformResponse.builder()
                .id(platform.getId())
                .name(platform.getName())
                .build();
    }

    private void applyRequestToEntity(MediaItem item, MediaItemRequest request) {
        item.setCategory(request.getCategory());
        item.setName(request.getName());
        item.setYear(request.getYear());

        item.setGenres(resolveGenres(request.getGenreIds()));
        item.setPlatforms(resolvePlatforms(request.getPlatformIds()));
    }

    private Set<Genre> resolveGenres(Set<Long> ids) {
        List<Genre> genres = genreRepository.findAllById(ids);
        if (genres.size() != ids.size()) {
            throw new ResourceNotFoundException("One or more genres not found");
        }
        return new HashSet<>(genres);
    }

    private Set<Platform> resolvePlatforms(Set<Long> ids) {
        List<Platform> platforms = platformRepository.findAllById(ids);
        if (platforms.size() != ids.size()) {
            throw new ResourceNotFoundException("One or more platforms not found");
        }
        return new HashSet<>(platforms);
    }
}
