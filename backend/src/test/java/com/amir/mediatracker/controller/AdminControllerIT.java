package com.amir.mediatracker.controller;

import com.amir.mediatracker.dto.Category;
import com.amir.mediatracker.dto.request.GenreRequest;
import com.amir.mediatracker.dto.request.MediaItemRequest;
import com.amir.mediatracker.dto.request.PlatformRequest;
import com.amir.mediatracker.entity.Genre;
import com.amir.mediatracker.entity.MediaItem;
import com.amir.mediatracker.entity.Platform;
import com.amir.mediatracker.repository.GenreRepository;
import com.amir.mediatracker.repository.MediaItemRepository;
import com.amir.mediatracker.repository.PlatformRepository;
import com.amir.mediatracker.security.JwtTokenProvider;
import com.amir.mediatracker.service.AsyncBatchService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;
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
import org.springframework.security.core.userdetails.User;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.nio.file.Path;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Testcontainers
@AutoConfigureMockMvc
class AdminControllerIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private GenreRepository genreRepository;

    @Autowired
    private PlatformRepository platformRepository;

    @Autowired
    private MediaItemRepository mediaItemRepository;

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
        User adminUser =
                new User(
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

        //clear DB
        genreRepository.deleteAll();
        platformRepository.deleteAll();
        mediaItemRepository.deleteAll();
    }

    @Test
    void createUpdateAndDeleteMediaItem_shouldSucceed() throws Exception {
        //Arrange - create
        Genre genre = new Genre();
        genre.setName("someGenre");
        genre = genreRepository.save(genre);
        Platform platform = new Platform();
        platform.setName("somePlatform");
        platform = platformRepository.save(platform);
        MediaItemRequest request = createMockMediaItemRequest();
        request.setGenreIds(Set.of(genre.getId()));
        request.setPlatformIds(Set.of(platform.getId()));
        // Act & Assert - create
        MvcResult result = mockMvc.perform(post("/admin/media-items")
                        .contentType(APPLICATION_JSON_VALUE)
                        .content(objectMapper.writeValueAsString(request))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isCreated())
                .andReturn();

        //Arrange - update
        Integer id = JsonPath.read(result.getResponse().getContentAsString(), "$.id");

        genre.setName("someOtherGenre");
        genre = genreRepository.save(genre);
        platform.setName("someOtherPlatform");
        platform = platformRepository.save(platform);
        request.setYear(1990);
        request.setGenreIds(Set.of(genre.getId()));
        request.setPlatformIds(Set.of(platform.getId()));

        //Act & Assert - update
        mockMvc.perform(put("/admin/media-items/" + id)
                        .contentType(APPLICATION_JSON_VALUE)
                        .content(objectMapper.writeValueAsString(request))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        MediaItem mediaItem = mediaItemRepository.findById(Long.valueOf(id)).get();
        assertEquals(1, mediaItem.getGenres().size());
        assertTrue(mediaItem.getGenres().stream().map(Genre::getName).toList().contains("someOtherGenre"));
        assertEquals(1, mediaItem.getPlatforms().size());
        assertTrue(mediaItem.getPlatforms().stream().map(Platform::getName).toList().contains("someOtherPlatform"));
        assertEquals(1990, mediaItem.getYear());

        //delete
        mockMvc.perform(delete("/admin/media-items/" + id)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        assertTrue(mediaItemRepository.findById(Long.valueOf(id)).isEmpty());
    }

    @Test
    void deleteMediaItem_shouldReturn404_becauseMediaItemNotExist() throws Exception {
        //Arrange
        // Act & Assert
        mockMvc.perform(delete("/admin/media-items/1")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void updateMediaItem_shouldReturn404_becausePlatformNotExist() throws Exception {
        //Arrange
        Genre genre = new Genre();
        genre.setName("someGenre");
        genre = genreRepository.save(genre);
        Platform platform = new Platform();
        platform.setName("somePlatform");
        platform = platformRepository.save(platform);


        MediaItem mediaItem = mediaItemRepository.save(MediaItem.builder()
                .name("someName")
                .year(2000)
                .category(Category.MOVIE)
                .platforms(Set.of(platform))
                .genres(Set.of(genre))
                .build());

        MediaItemRequest request = createMockMediaItemRequest();
        request.setGenreIds(Set.of(genre.getId()));
        // Act & Assert
        mockMvc.perform(put("/admin/media-items/" + mediaItem.getId())
                        .contentType(APPLICATION_JSON_VALUE)
                        .content(objectMapper.writeValueAsString(request))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void updateMediaItem_shouldReturn404_becauseGenreNotExist() throws Exception {
        //Arrange
        Genre genre = new Genre();
        genre.setName("someGenre");
        genre = genreRepository.save(genre);
        Platform platform = new Platform();
        platform.setName("somePlatform");
        platform = platformRepository.save(platform);

        MediaItem mediaItem = mediaItemRepository.save(MediaItem.builder()
                        .name("someName")
                        .year(2000)
                        .category(Category.MOVIE)
                        .platforms(Set.of(platform))
                        .genres(Set.of(genre))
                .build());

        MediaItemRequest request = createMockMediaItemRequest();
        request.setPlatformIds(Set.of(platform.getId()));
        // Act & Assert
        mockMvc.perform(put("/admin/media-items/" + mediaItem.getId())
                        .contentType(APPLICATION_JSON_VALUE)
                        .content(objectMapper.writeValueAsString(request))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void updateMediaItem_shouldReturn404_becauseMediaItemNotExist() throws Exception {
        //Arrange
        MediaItemRequest request = createMockMediaItemRequest();
        // Act & Assert
        mockMvc.perform(put("/admin/media-items/1")
                        .contentType(APPLICATION_JSON_VALUE)
                        .content(objectMapper.writeValueAsString(request))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void createMediaItem_shouldReturn404_becausePlatformNotExist() throws Exception {
        //Arrange
        Platform platform = new Platform();
        platform.setName("somePlatform");
        platform = platformRepository.save(platform);
        MediaItemRequest request = createMockMediaItemRequest();
        request.setPlatformIds(Set.of(platform.getId()));
        // Act & Assert
        mockMvc.perform(post("/admin/media-items")
                        .contentType(APPLICATION_JSON_VALUE)
                        .content(objectMapper.writeValueAsString(request))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void createMediaItem_shouldReturn404_becauseGenreNotExist() throws Exception {
        //Arrange
        Genre genre = new Genre();
        genre.setName("someGenre");
        genre = genreRepository.save(genre);
        MediaItemRequest request = createMockMediaItemRequest();
        request.setGenreIds(Set.of(genre.getId()));
        // Act & Assert
        mockMvc.perform(post("/admin/media-items")
                        .contentType(APPLICATION_JSON_VALUE)
                        .content(objectMapper.writeValueAsString(request))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void createMediaItem_shouldSucceedAndThenReturn409() throws Exception {
        //Arrange
        Genre genre = new Genre();
        genre.setName("someGenre");
        genre = genreRepository.save(genre);
        Platform platform = new Platform();
        platform.setName("somePlatform");
        platform = platformRepository.save(platform);
        MediaItemRequest request = createMockMediaItemRequest();
        request.setGenreIds(Set.of(genre.getId()));
        request.setPlatformIds(Set.of(platform.getId()));
        // Act & Assert
        mockMvc.perform(post("/admin/media-items")
                        .contentType(APPLICATION_JSON_VALUE)
                        .content(objectMapper.writeValueAsString(request))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/admin/media-items")
                        .contentType(APPLICATION_JSON_VALUE)
                        .content(objectMapper.writeValueAsString(request))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isConflict());
    }

    @Test
    void createMediaItem_shouldReturn400_becausePlatformIdsEmpty() throws Exception {
        MediaItemRequest request = createMockMediaItemRequest();
        request.setPlatformIds(new HashSet<>());
        // Act & Assert
        mockMvc.perform(post("/admin/media-items")
                        .contentType(APPLICATION_JSON_VALUE)
                        .content(objectMapper.writeValueAsString(request))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createMediaItem_shouldReturn400_becauseGenreIdsEmpty() throws Exception {
        MediaItemRequest request = createMockMediaItemRequest();
        request.setGenreIds(new HashSet<>());
        // Act & Assert
        mockMvc.perform(post("/admin/media-items")
                        .contentType(APPLICATION_JSON_VALUE)
                        .content(objectMapper.writeValueAsString(request))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createMediaItem_shouldReturn400_becauseNameBlank() throws Exception {
        MediaItemRequest request = createMockMediaItemRequest();
        request.setName("  ");
        // Act & Assert
        mockMvc.perform(post("/admin/media-items")
                        .contentType(APPLICATION_JSON_VALUE)
                        .content(objectMapper.writeValueAsString(request))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createMediaItem_shouldReturn400_becauseCategoryNull() throws Exception {
        MediaItemRequest request = createMockMediaItemRequest();
        request.setCategory(null);
        // Act & Assert
        mockMvc.perform(post("/admin/media-items")
                        .contentType(APPLICATION_JSON_VALUE)
                        .content(objectMapper.writeValueAsString(request))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getAllPlatforms_shouldReturnEmptyResult() throws Exception {
        //Arrange
        // Act & Assert
        mockMvc.perform(get("/admin/platforms")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void createPlatform_shouldReturnBadRequest_becauseEmptyName() throws Exception {
        //Arrange
        PlatformRequest request = new PlatformRequest();
        request.setName("    ");
        // Act & Assert
        mockMvc.perform(post("/admin/platforms")
                        .contentType(APPLICATION_JSON_VALUE)
                        .content(objectMapper.writeValueAsString(request))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createPlatformsAndGetAllPlatforms_shouldReturnAllResults() throws Exception {
        //Create platforms
        List<String> platformNames = List.of("Netflix", "Disney+", "HBO Max", "PC", "Playstation 5");
        platformNames.forEach(pn -> {
            PlatformRequest request = new PlatformRequest();
            request.setName(pn);
            try {
                mockMvc.perform(post("/admin/platforms")
                                .contentType(APPLICATION_JSON_VALUE)
                                .content(objectMapper.writeValueAsString(request))
                                .header("Authorization", "Bearer " + adminToken))
                        .andExpect(status().isOk());
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        });
        //Get all platforms
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
        // Act & Assert
        mockMvc.perform(get("/admin/genres")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void createGenre_shouldReturnBadRequest_becauseEmptyName() throws Exception {
        //Arrange
        GenreRequest request = new GenreRequest();
        request.setName("    ");
        // Act & Assert
        mockMvc.perform(post("/admin/genres")
                        .contentType(APPLICATION_JSON_VALUE)
                        .content(objectMapper.writeValueAsString(request))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createGenresAndGetAllGenres_shouldReturnAllResults() throws Exception {
        //Create genres
        List<String> genreNames = List.of("Action", "Drama", "Documentary");
        genreNames.forEach(gn -> {
            GenreRequest request = new GenreRequest();
            request.setName(gn);
            try {
                mockMvc.perform(post("/admin/genres")
                                .contentType(APPLICATION_JSON_VALUE)
                                .content(objectMapper.writeValueAsString(request))
                                .header("Authorization", "Bearer " + adminToken))
                        .andExpect(status().isOk());
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        });
        //Get all platforms
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

    private MediaItemRequest createMockMediaItemRequest() {
        MediaItemRequest request = new MediaItemRequest();
        request.setCategory(Category.MOVIE);
        request.setName("someName");
        request.setYear(2000);
        request.setGenreIds(Set.of(1L));
        request.setPlatformIds(Set.of(1L));
        return request;
    }
}