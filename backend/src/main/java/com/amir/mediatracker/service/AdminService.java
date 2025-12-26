package com.amir.mediatracker.service;

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
import com.amir.mediatracker.exception.DuplicateResourceException;
import com.amir.mediatracker.exception.ResourceNotFoundException;
import com.amir.mediatracker.repository.GenreRepository;
import com.amir.mediatracker.repository.MediaItemRepository;
import com.amir.mediatracker.repository.PlatformRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.JobExecution;
import org.springframework.batch.core.StepExecution;
import org.springframework.batch.core.explore.JobExplorer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.lang.management.GarbageCollectorMXBean;
import java.time.LocalDateTime;
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

    public List<GenreResponse> getAllGenres() {
        return genreRepository.findAll().stream()
                .map(this::mapGenreToResponse)
                .collect(Collectors.toList());
    }

    public List<PlatformResponse> getAllPlatforms() {
        return platformRepository.findAll().stream()
                .map(this::mapPlatformToResponse)
                .collect(Collectors.toList());
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
        // Check for duplicates
        Optional<MediaItem> existing = mediaItemRepository
                .findByNameAndCategory(request.getName(), request.getCategory());

        if (existing.isPresent()) {
            throw new DuplicateResourceException(
                    "Media item with this name and category already exists");
        }

        MediaItem item = new MediaItem();
        item.setCategory(request.getCategory());
        item.setName(request.getName());
        item.setYear(request.getYear());

        // Fetch and set genres
        Set<Genre> genres = new HashSet<>();
        for (Long genreId : request.getGenreIds()) {
            Genre genre = genreRepository.findById(genreId)
                    .orElseThrow(() -> new ResourceNotFoundException("Genre not found: " + genreId));
            genres.add(genre);
        }
        item.setGenres(genres);

        // Fetch and set platforms
        Set<Platform> platforms = new HashSet<>();
        for (Long platformId : request.getPlatformIds()) {
            Platform platform = platformRepository.findById(platformId)
                    .orElseThrow(() -> new ResourceNotFoundException("Platform not found: " + platformId));
            platforms.add(platform);
        }
        item.setPlatforms(platforms);

        MediaItem saved = mediaItemRepository.save(item);
        return mapToResponse(saved);
    }

    @Transactional
    public MediaItemResponse updateMediaItem(Long id, MediaItemRequest request) {
        MediaItem item = mediaItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Media item not found"));

        item.setCategory(request.getCategory());
        item.setName(request.getName());
        item.setYear(request.getYear());

        // Update genres
        Set<Genre> genres = new HashSet<>();
        for (Long genreId : request.getGenreIds()) {
            Genre genre = genreRepository.findById(genreId)
                    .orElseThrow(() -> new ResourceNotFoundException("Genre not found: " + genreId));
            genres.add(genre);
        }
        item.setGenres(genres);

        // Update platforms
        Set<Platform> platforms = new HashSet<>();
        for (Long platformId : request.getPlatformIds()) {
            Platform platform = platformRepository.findById(platformId)
                    .orElseThrow(() -> new ResourceNotFoundException("Platform not found: " + platformId));
            platforms.add(platform);
        }
        item.setPlatforms(platforms);

        item.setUpdatedAt(LocalDateTime.now());

        MediaItem saved = mediaItemRepository.save(item);
        return mapToResponse(saved);
    }

    @Transactional
    public void deleteMediaItem(Long id) {
        if (!mediaItemRepository.existsById(id)) {
            throw new ResourceNotFoundException("Media item not found");
        }
        mediaItemRepository.deleteById(id);
    }

    public Page<MediaItemResponse> getAllMediaItems(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("name").ascending());
        Page<MediaItem> items = mediaItemRepository.findAll(pageable);
        return items.map(this::mapToResponse);
    }

    public JobStatusResponse getJobStatus(Long jobExecutionId) {
        JobExecution jobExecution = jobExplorer.getJobExecution(jobExecutionId);

        if (jobExecution == null) {
            throw new ResourceNotFoundException("Job execution not found");
        }

        long readCount = 0;
        long writeCount = 0;
        long skipCount = 0;

        for (StepExecution stepExecution : jobExecution.getStepExecutions()) {
            readCount += stepExecution.getReadCount();
            writeCount += stepExecution.getWriteCount();
            skipCount += stepExecution.getSkipCount();
        }

        return JobStatusResponse.builder()
                .jobExecutionId(jobExecution.getId())
                .status(jobExecution.getStatus().toString())
                .startTime(jobExecution.getStartTime())
                .endTime(jobExecution.getEndTime())
                .readCount(readCount)
                .writeCount(writeCount)
                .skipCount(skipCount)
                .exitCode(jobExecution.getExitStatus().getExitCode())
                .exitMessage(jobExecution.getExitStatus().getExitDescription())
                .build();
    }

    private MediaItemResponse mapToResponse(MediaItem item) {
        return MediaItemResponse.builder()
                .id(item.getId())
                .category(item.getCategory())
                .name(item.getName())
                .year(item.getYear())
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
}
