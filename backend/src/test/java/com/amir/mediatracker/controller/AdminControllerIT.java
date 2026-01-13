package com.amir.mediatracker.controller;

import com.amir.mediatracker.entity.Genre;
import com.amir.mediatracker.entity.Platform;
import com.amir.mediatracker.repository.GenreRepository;
import com.amir.mediatracker.repository.PlatformRepository;
import com.amir.mediatracker.security.JwtTokenProvider;
import com.amir.mediatracker.service.AsyncBatchService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.springframework.batch.core.BatchStatus;
import org.springframework.batch.core.JobExecution;
import org.springframework.batch.core.JobParameters;
import org.springframework.batch.core.explore.JobExplorer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.nio.file.Path;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class AdminControllerIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private GenreRepository genreRepository;

    @Autowired
    private PlatformRepository platformRepository;

    @MockitoBean
    private AsyncBatchService asyncBatchService;

    @MockitoBean
    private JobExplorer jobExplorer;

    @TempDir
    Path tempDir;

    private String adminToken;
    private String userToken;

    @BeforeEach
    void setUp() {
        // Create admin UserDetails
        org.springframework.security.core.userdetails.User adminUser =
                new org.springframework.security.core.userdetails.User(
                        "admin",
                        "password",
                        Collections.singletonList(new SimpleGrantedAuthority("ROLE_ADMIN"))
                );

        Authentication adminAuth = new UsernamePasswordAuthenticationToken(
                adminUser,
                null,
                adminUser.getAuthorities()
        );
        adminToken = jwtTokenProvider.generateToken(adminAuth);

        // Create user UserDetails
        org.springframework.security.core.userdetails.User regularUser =
                new org.springframework.security.core.userdetails.User(
                        "user",
                        "password",
                        Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"))
                );

        Authentication userAuth = new UsernamePasswordAuthenticationToken(
                regularUser,
                null,
                regularUser.getAuthorities()
        );
        userToken = jwtTokenProvider.generateToken(userAuth);
    }

    @Test
    void getAllPlatforms_shouldReturnEmptyResult() throws Exception {
        //Arrange
        platformRepository.deleteAll();
        // Act & Assert
        mockMvc.perform(get("/admin/platforms")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void getAllPlatforms_shouldReturnAllResults() throws Exception {
        //Arrange
        savePlatforms(List.of("Netflix", "Disney+", "HBO Max", "PC", "Playstation 5"));
        // Act & Assert
        mockMvc.perform(get("/admin/platforms")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(MockMvcResultMatchers.jsonPath("$.length()").value(5))
                .andExpect(jsonPath("$[*].id").isNotEmpty())
                .andExpect(jsonPath("$[*].name").isNotEmpty());
    }

    @Test
    void getAllGenres_shouldReturnEmptyResult() throws Exception {
        //Arrange
        genreRepository.deleteAll();
        // Act & Assert
        mockMvc.perform(get("/admin/genres")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void getAllGenres_shouldReturnAllResults() throws Exception {
        //Arrange
        saveGenres(List.of("Action", "Drama", "Documentary"));
        // Act & Assert
        mockMvc.perform(get("/admin/genres")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(MockMvcResultMatchers.jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[*].id").isNotEmpty())
                .andExpect(jsonPath("$[*].name").isNotEmpty());
    }

    @Test
    void getJobStatus_shouldReturn200AndCompleted() throws Exception {
        //Arrange
        when(asyncBatchService.resolveJobExecutionId(any())).thenReturn(1L);
        JobExecution execution = new JobExecution(1L);
        execution.setStatus(BatchStatus.COMPLETED);
        when(jobExplorer.getJobExecution(any())).thenReturn(execution);
        // Act & Assert
        mockMvc.perform(get("/admin/media-items/import-status/1")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(BatchStatus.COMPLETED.toString()));
    }

    @Test
    void getJobStatus_shouldReturn200AndStarting() throws Exception {
        // Arrange
        when(asyncBatchService.resolveJobExecutionId(any())).thenReturn(null);
        verify(jobExplorer, times(0)).getJobExecution(any());
        when(jobExplorer.getJobExecution(any())).thenReturn(null);
        // Act & Assert
        mockMvc.perform(get("/admin/media-items/import-status/1")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(jsonPath("$.status").value(BatchStatus.STARTING.toString()));
    }

    @Test
    void getJobStatus_shouldReturn404() throws Exception {
        // Arrange
        when(asyncBatchService.resolveJobExecutionId(any())).thenReturn(1L);
        when(jobExplorer.getJobExecution(any())).thenReturn(null);
        // Act & Assert
        mockMvc.perform(get("/admin/media-items/import-status/1")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void importCsv_WithValidFile_ShouldReturnStartingStatus() throws Exception {
        // Arrange
        String csvContent = "category,name,year,genres,platforms\n" +
                "MOVIE,The Matrix,1999,Action|Sci-Fi,Netflix|HBO\n" +
                "SERIES,Breaking Bad,2008,Drama|Crime,Netflix\n";

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "media_items.csv",
                "text/csv",
                csvContent.getBytes()
        );

        // Mock the async batch service to not actually run the job
        doNothing().when(asyncBatchService).startImportJob(anyLong(), any(JobParameters.class));

        // Act & Assert
        mockMvc.perform(multipart("/admin/media-items/import-csv")
                        .file(file)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correlationId").exists())
                .andExpect(jsonPath("$.status").value("STARTING"));

        // Verify that the batch service was called
        ArgumentCaptor<Long> correlationIdCaptor = ArgumentCaptor.forClass(Long.class);
        ArgumentCaptor<JobParameters> jobParamsCaptor = ArgumentCaptor.forClass(JobParameters.class);

        verify(asyncBatchService, times(1))
                .startImportJob(correlationIdCaptor.capture(), jobParamsCaptor.capture());

        // Verify correlation ID is reasonable
        Long correlationId = correlationIdCaptor.getValue();
        assertThat(correlationId).isGreaterThan(0L);

        // Verify job parameters contain file path
        JobParameters jobParams = jobParamsCaptor.getValue();
        assertThat(jobParams.getString("filePath")).isNotNull();
        assertThat(jobParams.getString("filePath")).contains("media-import-");
    }

    @Test
    void importCsv_WithoutAuthentication_ShouldReturn401() throws Exception {
        // Arrange
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test.csv",
                "text/csv",
                "category,name,year,genres,platforms".getBytes()
        );

        // Act & Assert
        mockMvc.perform(multipart("/admin/media-items/import-csv")
                        .file(file))
                .andExpect(status().isUnauthorized());

        // Verify batch service was never called
        verify(asyncBatchService, never()).startImportJob(anyLong(), any());
    }

    @Test
    void importCsv_WithUserRole_ShouldReturn401() throws Exception {
        // Arrange
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test.csv",
                "text/csv",
                "category,name,year,genres,platforms".getBytes()
        );

        // Act & Assert
        mockMvc.perform(multipart("/admin/media-items/import-csv")
                        .file(file)
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isUnauthorized());

        // Verify batch service was never called
        verify(asyncBatchService, never()).startImportJob(anyLong(), any());
    }

    @Test
    void importCsv_WithEmptyFile_ShouldReturn400() throws Exception {
        // Arrange - Even empty files should be accepted and let batch processing handle it
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "empty.csv",
                "text/csv",
                "".getBytes()
        );

        doNothing().when(asyncBatchService).startImportJob(anyLong(), any(JobParameters.class));

        // Act & Assert
        mockMvc.perform(multipart("/admin/media-items/import-csv")
                        .file(file)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest());

        // Verify batch service was never called
        verify(asyncBatchService, never()).startImportJob(anyLong(), any());
    }

    @Test
    void importCsv_WithEmptyFileName_ShouldReturn400() throws Exception {
        // Arrange - Even empty files should be accepted and let batch processing handle it
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "",
                "text/csv",
                "category,name,year,genres,platforms".getBytes()
        );

        doNothing().when(asyncBatchService).startImportJob(anyLong(), any(JobParameters.class));

        // Act & Assert
        mockMvc.perform(multipart("/admin/media-items/import-csv")
                        .file(file)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest());

        // Verify batch service was never called
        verify(asyncBatchService, never()).startImportJob(anyLong(), any());
    }

    @Test
    void importCsv_WithUnsupportedFile_ShouldReturn400() throws Exception {
        // Arrange - Even empty files should be accepted and let batch processing handle it
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "unsupported.xlsx",
                "text/csv",
                "category,name,year,genres,platforms".getBytes()
        );

        doNothing().when(asyncBatchService).startImportJob(anyLong(), any(JobParameters.class));

        // Act & Assert
        mockMvc.perform(multipart("/admin/media-items/import-csv")
                        .file(file)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest());

        // Verify batch service was never called
        verify(asyncBatchService, never()).startImportJob(anyLong(), any());
    }

    @Test
    void importCsv_WithLargeFile_ShouldAccept() throws Exception {
        // Arrange - Test with a larger CSV
        StringBuilder csvBuilder = new StringBuilder("category,name,year,genres,platforms\n");
        for (int i = 0; i < 100; i++) {
            csvBuilder.append(String.format("MOVIE,Test Movie %d,%d,Action,Netflix\n", i, 2000 + i));
        }

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "large.csv",
                "text/csv",
                csvBuilder.toString().getBytes()
        );

        doNothing().when(asyncBatchService).startImportJob(anyLong(), any(JobParameters.class));

        // Act & Assert
        mockMvc.perform(multipart("/admin/media-items/import-csv")
                        .file(file)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correlationId").exists());

        verify(asyncBatchService, times(1))
                .startImportJob(anyLong(), any(JobParameters.class));
    }

    @Test
    void importCsv_VerifyFileIsSavedToTempDirectory() throws Exception {
        // Arrange
        String csvContent = "category,name,year,genres,platforms\n" +
                "MOVIE,Test,2020,Action,Netflix\n";

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test.csv",
                "text/csv",
                csvContent.getBytes()
        );

        doNothing().when(asyncBatchService).startImportJob(anyLong(), any(JobParameters.class));

        // Act
        mockMvc.perform(multipart("/admin/media-items/import-csv")
                        .file(file)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        // Assert - Verify the file path passed to batch service points to temp directory
        ArgumentCaptor<JobParameters> jobParamsCaptor = ArgumentCaptor.forClass(JobParameters.class);
        verify(asyncBatchService).startImportJob(anyLong(), jobParamsCaptor.capture());

        String filePath = jobParamsCaptor.getValue().getString("filePath");
        assertThat(filePath).isNotNull();
        assertThat(filePath).contains(System.getProperty("java.io.tmpdir"));
        assertThat(filePath).endsWith(".csv");
    }

    private void saveGenres(List<String> genreNames) {
        Set<Genre> genreList = new HashSet<>();
        genreNames.forEach(genreName -> {
            Genre genre = new Genre();
            genre.setName(genreName);
            genreList.add(genre);
        });
        genreRepository.saveAll(genreList);
    }

    private void savePlatforms(List<String> platformNames) {
        Set<Platform> platformList = new HashSet<>();
        platformNames.forEach(genreName -> {
            Platform platform = new Platform();
            platform.setName(genreName);
            platformList.add(platform);
        });
        platformRepository.saveAll(platformList);
    }
}