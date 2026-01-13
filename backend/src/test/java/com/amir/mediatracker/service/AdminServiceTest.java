package com.amir.mediatracker.service;

import com.amir.mediatracker.dto.response.GenreResponse;
import com.amir.mediatracker.dto.response.JobStatusResponse;
import com.amir.mediatracker.dto.response.PlatformResponse;
import com.amir.mediatracker.entity.Genre;
import com.amir.mediatracker.entity.Platform;
import com.amir.mediatracker.exception.ResourceNotFoundException;
import com.amir.mediatracker.repository.GenreRepository;
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

import java.util.Collections;
import java.util.List;

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

    @InjectMocks
    private AdminService adminService;

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
