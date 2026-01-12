package com.amir.mediatracker.controller;

import com.amir.mediatracker.security.JwtTokenProvider;
import com.amir.mediatracker.service.AsyncBatchService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.springframework.batch.core.JobParameters;
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
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.nio.file.Path;
import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

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

    @MockitoBean
    private AsyncBatchService asyncBatchService;

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
                adminUser,  // Pass UserDetails object, not String
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
                regularUser,  // Pass UserDetails object, not String
                null,
                regularUser.getAuthorities()
        );
        userToken = jwtTokenProvider.generateToken(userAuth);
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
}