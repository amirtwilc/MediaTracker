package com.amir.mediatracker.service;

import com.amir.mediatracker.dto.Category;
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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.batch.core.BatchStatus;
import org.springframework.batch.core.ExitStatus;
import org.springframework.batch.core.JobExecution;
import org.springframework.batch.core.explore.JobExplorer;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.AssertionsForClassTypes.assertThatNoException;
import static org.assertj.core.api.AssertionsForClassTypes.assertThatThrownBy;
import static org.assertj.core.api.AssertionsForInterfaceTypes.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AdminServiceTest {

    @Mock
    private AsyncBatchService asyncBatchService;
    @Mock
    private JobExplorer jobExplorer;
    @Mock
    private GenreRepository genreRepository;
    @Mock
    private PlatformRepository platformRepository;
    @Mock
    private MediaItemRepository mediaItemRepository;

    @InjectMocks
    private AdminService adminService;

    @Test
    public void deleteMediaItem_shouldSucceed() {
        //Arrange
        when(mediaItemRepository.existsById(any())).thenReturn(true);
        //Act & Assert
        assertThatNoException().isThrownBy(() -> adminService.deleteMediaItem(any()));
    }

    @Test
    public void deleteMediaItem_shouldThrowResourceNotFoundException() {
        //Arrange
        when(mediaItemRepository.existsById(any())).thenReturn(false);
        //Act & Assert
        assertThatThrownBy(() -> adminService.deleteMediaItem(any()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("not found");
    }

    @Test
    public void updateMediaItem_shouldSucceed() {
        //Arrange
        when(mediaItemRepository.findById(any())).thenReturn(Optional.of(MediaItem.builder()
                .name("someName")
                .category(Category.MOVIE)
                .build()));
        when(genreRepository.findAllById(any()))
                .thenReturn(List.of(new Genre(), new Genre()));
        when(platformRepository.findAllById(any()))
                .thenReturn(List.of(new Platform(), new Platform()));
        MediaItem mediaItem = new MediaItem();
        mediaItem.setGenres(Set.of(new Genre(1L, "Action", LocalDateTime.now())));
        mediaItem.setPlatforms(Set.of(new Platform(1L, "Netflix", LocalDateTime.now())));
        mediaItem.setYear(2022);
        mediaItem.setCategory(Category.MOVIE);
        mediaItem.setName("someName");
        when(mediaItemRepository.save(any())).thenReturn(mediaItem);
        MediaItemRequest request = new MediaItemRequest();
        request.setCategory(Category.MOVIE);
        request.setName("someName");
        request.setYear(1999);
        request.setGenreIds(Set.of(1L, 2L));
        request.setPlatformIds(Set.of(1L, 2L));
        //Act
        MediaItemResponse response = adminService.updateMediaItem(1L, request);
        //
        assertThat(response)
                .isNotNull()
                .extracting(MediaItemResponse::getName, MediaItemResponse::getCategory, MediaItemResponse::getYear)
                .containsExactly("someName", Category.MOVIE, 2022);
    }

    @Test
    public void updateMediaItem_shouldThrowResourceNotFoundException_becausePlatformNotExist() {
        //Arrange
        when(mediaItemRepository.findById(any())).thenReturn(Optional.of(MediaItem.builder()
                .name("someName")
                .category(Category.MOVIE)
                .build()));
        when(genreRepository.findAllById(any()))
                .thenReturn(List.of(new Genre(), new Genre()));
        when(platformRepository.findAllById(any()))
                .thenReturn(List.of(new Platform()));
        MediaItemRequest request = new MediaItemRequest();
        request.setCategory(Category.MOVIE);
        request.setName("someName");
        request.setGenreIds(Set.of(1L, 2L));
        request.setPlatformIds(Set.of(1L, 2L));
        //Act & Assert
        assertThatThrownBy(() -> adminService.updateMediaItem(1L, request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("not found");
    }

    @Test
    public void updateMediaItem_shouldThrowResourceNotFoundException_becauseGenreNotExist() {
        //Arrange
        when(mediaItemRepository.findById(any())).thenReturn(Optional.of(MediaItem.builder()
                        .name("someName")
                        .category(Category.MOVIE)
                .build()));
        when(genreRepository.findAllById(any()))
                .thenReturn(List.of(new Genre()));
        MediaItemRequest request = new MediaItemRequest();
        request.setCategory(Category.MOVIE);
        request.setName("someName");
        request.setGenreIds(Set.of(1L, 2L));
        request.setPlatformIds(Set.of(1L, 2L));
        //Act & Assert
        assertThatThrownBy(() -> adminService.updateMediaItem(1L, request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("not found");
    }

    @Test
    public void updateMediaItem_shouldThrowResourceNotFoundException_becauseItemNotExist() {
        //Arrange
        when(mediaItemRepository.findById(any())).thenReturn(Optional.empty());
        MediaItemRequest request = new MediaItemRequest();
        request.setCategory(Category.MOVIE);
        request.setName("someName");
        //Act & Assert
        assertThatThrownBy(() -> adminService.updateMediaItem(1L, request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("not found");
    }

    @Test
    public void createMediaItem_shouldSucceed() {
        //Arrange
        when(mediaItemRepository.findByNameAndCategory(any(), any())).thenReturn(Optional.empty());
        when(genreRepository.findAllById(any()))
                .thenReturn(List.of(new Genre(), new Genre()));
        when(platformRepository.findAllById(any()))
                .thenReturn(List.of(new Platform(), new Platform()));
        MediaItem mediaItem = new MediaItem();
        mediaItem.setGenres(Set.of(new Genre(1L, "Action", LocalDateTime.now())));
        mediaItem.setPlatforms(Set.of(new Platform(1L, "Netflix", LocalDateTime.now())));
        when(mediaItemRepository.save(any())).thenReturn(mediaItem);
        MediaItemRequest request = new MediaItemRequest();
        request.setCategory(Category.MOVIE);
        request.setName("someName");
        request.setGenreIds(Set.of(1L, 2L));
        request.setPlatformIds(Set.of(1L, 2L));
        //Act
        MediaItemResponse response = adminService.createMediaItem(request);
        //
        assertNotNull(response);
    }

    @Test
    public void createMediaItem_shouldThrowResourceNotFoundException_becausePlatformNotExist() {
        //Arrange
        when(mediaItemRepository.findByNameAndCategory(any(), any())).thenReturn(Optional.empty());
        when(genreRepository.findAllById(any()))
                .thenReturn(List.of(new Genre(), new Genre()));
        when(platformRepository.findAllById(any()))
                .thenReturn(List.of(new Platform()));
        MediaItemRequest request = new MediaItemRequest();
        request.setCategory(Category.MOVIE);
        request.setName("someName");
        request.setGenreIds(Set.of(1L, 2L));
        request.setPlatformIds(Set.of(1L, 2L));
        //Act & Assert
        assertThatThrownBy(() -> adminService.createMediaItem(request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("not found");
    }

    @Test
    public void createMediaItem_shouldThrowResourceNotFoundException_becauseGenreNotExist() {
        //Arrange
        when(mediaItemRepository.findByNameAndCategory(any(), any())).thenReturn(Optional.empty());
        when(genreRepository.findAllById(any()))
                .thenReturn(List.of(new Genre()));
        MediaItemRequest request = new MediaItemRequest();
        request.setCategory(Category.MOVIE);
        request.setName("someName");
        request.setGenreIds(Set.of(1L, 2L));
        request.setPlatformIds(Set.of(1L, 2L));
        //Act & Assert
        assertThatThrownBy(() -> adminService.createMediaItem(request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("not found");
    }

    @Test
    public void createMediaItem_shouldThrowDuplicateResourceException() {
        //Arrange
        when(mediaItemRepository.findByNameAndCategory(any(), any())).thenReturn(Optional.of(new MediaItem()));
        MediaItemRequest request = new MediaItemRequest();
        request.setCategory(Category.MOVIE);
        request.setName("someName");
        //Act & Assert
        assertThatThrownBy(() -> adminService.createMediaItem(request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    public void createPlatform_shouldReturnValidResponse() {
        //Arrange
        when(platformRepository.findByNameIgnoreCase(any())).thenReturn(Optional.empty());
        PlatformRequest request = new PlatformRequest();
        request.setName("Netflix");
        when(platformRepository.save(any())).thenReturn(new Platform(1L, "Netflix", LocalDateTime.now()));
        //Act
        PlatformResponse response = adminService.createPlatform(request);
        //Assert
        assertNotNull(response);
        assertEquals("Netflix", response.getName());
    }

    @Test
    public void createPlatform_shouldThrowDuplicateException() {
        //Arrange
        when(platformRepository.findByNameIgnoreCase(any())).thenReturn(Optional.of(new Platform()));
        PlatformRequest request = new PlatformRequest();
        request.setName("Netflix");
        //Act & Assert
        assertThatThrownBy(() -> adminService.createPlatform(request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    public void createGenre_shouldReturnValidResponse() {
        //Arrange
        when(genreRepository.findByNameIgnoreCase(any())).thenReturn(Optional.empty());
        GenreRequest request = new GenreRequest();
        request.setName("Action");
        when(genreRepository.save(any())).thenReturn(new Genre(1L, "Action", LocalDateTime.now()));
        //Act
        GenreResponse response = adminService.createGenre(request);
        //Assert
        assertNotNull(response);
        assertEquals("Action", response.getName());
    }

    @Test
    public void createGenre_shouldThrowDuplicateException() {
        //Arrange
        when(genreRepository.findByNameIgnoreCase(any())).thenReturn(Optional.of(new Genre()));
        GenreRequest request = new GenreRequest();
        request.setName("Action");
        //Act & Assert
        assertThatThrownBy(() -> adminService.createGenre(request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    public void getAllPlatforms_shouldReturnEmptyList() {
        //Arrange
        when(platformRepository.findAll()).thenReturn(Collections.emptyList());
        //Act
        List<PlatformResponse> platformResponseList = adminService.getAllPlatforms();
        //Assert
        assertEquals(0, platformResponseList.size());
    }

    @Test
    public void getAllPlatforms_shouldReturnAllPlatforms() {
        //Arrange
        when(platformRepository.findAll()).thenReturn(List.of(
                new Platform(1L, "Netflix", null)));
        //Act
        List<PlatformResponse> platformResponseList = adminService.getAllPlatforms();
        //Assert
        assertThat(platformResponseList)
                .hasSize(1)
                .first()
                .extracting(PlatformResponse::getId, PlatformResponse::getName)
                .containsExactly(1L, "Netflix");
    }

    @Test
    public void getAllGenres_shouldReturnEmptyList() {
        //Arrange
        when(genreRepository.findAll()).thenReturn(Collections.emptyList());
        //Act
        List<GenreResponse> genreResponseList = adminService.getAllGenres();
        //Assert
        assertEquals(0, genreResponseList.size());
    }

    @Test
    public void getAllGenres_shouldReturnAllGenres() {
        //Arrange
        when(genreRepository.findAll()).thenReturn(List.of(
                new Genre(1L, "Action", null),
                new Genre(2L, "Horror", null),
                new Genre(3L, "Comedy", null)));
        //Act
        List<GenreResponse> genreResponseList = adminService.getAllGenres();
        //Assert
        assertThat(genreResponseList)
                .hasSize(3)
                .first()
                .extracting(GenreResponse::getId, GenreResponse::getName)
                .isNotEmpty();
    }

    @Test
    public void getJobStatus_shouldReturnValidResponse() {
        //Arrange
        when(asyncBatchService.resolveJobExecutionId(any())).thenReturn(456L);
        JobExecution execution = new JobExecution(456L);
        execution.setStatus(BatchStatus.COMPLETED);
        execution.setExitStatus(ExitStatus.COMPLETED);
        when(jobExplorer.getJobExecution(any())).thenReturn(execution);
        //Act
        JobStatusResponse response = adminService.getJobStatus(123L);
        //Assert
        assertEquals(123L, response.getCorrelationId());
        assertEquals(456L, response.getJobExecutionId());
        assertEquals(BatchStatus.COMPLETED.toString(), response.getStatus());
        assertEquals(ExitStatus.COMPLETED.getExitCode(), response.getExitCode());
    }

    @Test
    public void getJobStatus_shouldReturnStarting() {
        //Arrange
        when(asyncBatchService.resolveJobExecutionId(any())).thenReturn(null);
        //Act
        JobStatusResponse response = adminService.getJobStatus(any());
        //Assert
        assertEquals("STARTING", response.getStatus());
        verify(jobExplorer, times(0)).getJobExecution(any());
    }

    @Test
    public void getJobStatus_shouldThrowResourceNotFoundException() {
        //Arrange
        when(asyncBatchService.resolveJobExecutionId(any())).thenReturn(1L);
        when(jobExplorer.getJobExecution(any())).thenReturn(null);
        //Act & Assert
        assertThatThrownBy(() -> adminService.getJobStatus(any()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Job execution not found");
    }
}
