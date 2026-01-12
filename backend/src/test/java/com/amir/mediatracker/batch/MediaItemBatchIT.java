package com.amir.mediatracker.batch;

import com.amir.mediatracker.dto.Category;
import com.amir.mediatracker.entity.Genre;
import com.amir.mediatracker.entity.MediaItem;
import com.amir.mediatracker.entity.Platform;
import com.amir.mediatracker.repository.GenreRepository;
import com.amir.mediatracker.repository.MediaItemRepository;
import com.amir.mediatracker.repository.PlatformRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.batch.core.*;
import org.springframework.batch.core.launch.JobLauncher;
import org.springframework.batch.test.JobLauncherTestUtils;
import org.springframework.batch.test.context.SpringBatchTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.batch.core.BatchStatus.COMPLETED;

@SpringBootTest
@SpringBatchTest
@Testcontainers
@TestPropertySource(properties = {
        "spring.batch.job.enabled=false" // Disable auto-run
})
class MediaItemBatchIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private JobLauncherTestUtils jobLauncherTestUtils;

    @Autowired
    private JobLauncher jobLauncher;

    @Autowired
    private Job mediaItemImportJob;

    @Autowired
    private MediaItemRepository mediaItemRepository;

    @Autowired
    private GenreRepository genreRepository;

    @Autowired
    private PlatformRepository platformRepository;

    @AfterEach
    void cleanup() {
        // Clean up database after each test
        mediaItemRepository.deleteAll();
        genreRepository.deleteAll();
        platformRepository.deleteAll();
    }

    @Test
    void importJob_WithValidCsv_ShouldInsertItemsToDatabase() throws Exception {
        // Arrange
        String csvContent = """
                category,name,year,genres,platforms
                MOVIE,The Matrix,1999,"Action,Sci-Fi","Netflix,HBO"
                SERIES,Breaking Bad,2008,"Drama,Crime",Netflix
                GAME,The Last of Us,2013,"Action,Adventure",PlayStation
                """;

        Path tempFile = createTempCsvFile(csvContent);

        JobParameters jobParameters = new JobParametersBuilder()
                .addString("filePath", tempFile.toString())
                .toJobParameters();

        // Act
        JobExecution jobExecution = jobLauncher.run(mediaItemImportJob, jobParameters);
        waitForCompleted(jobExecution);

        // Assert - Job completed successfully
        assertThat(jobExecution.getStatus()).isEqualTo(COMPLETED);
        assertThat(jobExecution.getStepExecutions()).hasSize(1);

        // Assert - Media items were saved
        List<MediaItem> allItems = mediaItemRepository.findAll();
        assertThat(allItems).hasSize(3);

        // Assert - The Matrix
        Optional<MediaItem> matrix = mediaItemRepository.findByNameAndCategory("The Matrix", Category.MOVIE);
        assertThat(matrix).isPresent();
        assertThat(matrix.get().getYear()).isEqualTo(1999);
        assertThat(matrix.get().getGenres()).hasSize(2);
        assertThat(matrix.get().getGenres())
                .extracting(Genre::getName)
                .containsExactlyInAnyOrder("Action", "Sci-Fi");
        assertThat(matrix.get().getPlatforms()).hasSize(2);
        assertThat(matrix.get().getPlatforms())
                .extracting(Platform::getName)
                .containsExactlyInAnyOrder("Netflix", "HBO");

        // Assert - Breaking Bad
        Optional<MediaItem> breakingBad = mediaItemRepository.findByNameAndCategory("Breaking Bad", Category.SERIES);
        assertThat(breakingBad).isPresent();
        assertThat(breakingBad.get().getYear()).isEqualTo(2008);

        // Assert - The Last of Us
        Optional<MediaItem> lastOfUs = mediaItemRepository.findByNameAndCategory("The Last of Us", Category.GAME);
        assertThat(lastOfUs).isPresent();
        assertThat(lastOfUs.get().getYear()).isEqualTo(2013);

        // Assert - Genres were created
        List<Genre> allGenres = genreRepository.findAll();
        assertThat(allGenres).hasSizeGreaterThanOrEqualTo(4); // Action, Sci-Fi, Drama, Crime, Adventure

        // Assert - Platforms were created
        List<Platform> allPlatforms = platformRepository.findAll();
        assertThat(allPlatforms).hasSizeGreaterThanOrEqualTo(3); // Netflix, HBO, PlayStation

        // Cleanup
        Files.deleteIfExists(tempFile);
    }

    @Test
    void importJob_WithDuplicateItem_ShouldUpdateExistingItem() throws Exception {
        // Arrange - Create existing item
        Genre actionGenre = new Genre();
        actionGenre.setName("Action");
        actionGenre = genreRepository.save(actionGenre);

        Platform netflixPlatform = new Platform();
        netflixPlatform.setName("Netflix");
        netflixPlatform = platformRepository.save(netflixPlatform);

        MediaItem existingItem = new MediaItem();
        existingItem.setCategory(Category.MOVIE);
        existingItem.setName("The Matrix");
        existingItem.setYear(1998); // Wrong year
        existingItem.getGenres().add(actionGenre);
        existingItem.getPlatforms().add(netflixPlatform);
        mediaItemRepository.save(existingItem);

        // CSV with corrected data
        String csvContent = """
                category,name,year,genres,platforms
                MOVIE,The Matrix,1999,"Action,Sci-Fi","Netflix,HBO,Amazon"
                """;

        Path tempFile = createTempCsvFile(csvContent);

        JobParameters jobParameters = new JobParametersBuilder()
                .addString("filePath", tempFile.toString())
                .toJobParameters();

        // Act
        JobExecution jobExecution = jobLauncher.run(mediaItemImportJob, jobParameters);
        waitForCompleted(jobExecution);

        // Assert - Job completed
        assertThat(jobExecution.getStatus()).isEqualTo(COMPLETED);

        // Assert - Only one Matrix item exists (updated, not duplicated)
        List<MediaItem> allItems = mediaItemRepository.findAll();
        assertThat(allItems).hasSize(1);

        // Assert - Item was updated with new data
        Optional<MediaItem> matrix = mediaItemRepository.findByNameAndCategory("The Matrix", Category.MOVIE);
        assertThat(matrix).isPresent();
        assertThat(matrix.get().getYear()).isEqualTo(1999); // Updated year
        assertThat(matrix.get().getGenres()).hasSize(2); // Updated genres
        assertThat(matrix.get().getGenres())
                .extracting(Genre::getName)
                .containsExactlyInAnyOrder("Action", "Sci-Fi");
        assertThat(matrix.get().getPlatforms()).hasSize(3); // Updated platforms
        assertThat(matrix.get().getPlatforms())
                .extracting(Platform::getName)
                .containsExactlyInAnyOrder("Netflix", "HBO", "Amazon");

        // Cleanup
        Files.deleteIfExists(tempFile);
    }

    @Test
    void importJob_WithInvalidCategory_ShouldSkipInvalidRows() throws Exception {
        // Arrange
        String csvContent = """
                category,name,year,genres,platforms
                MOVIE,Valid Movie,2020,Action,Netflix
                INVALID_CATEGORY,Invalid Item,2021,Drama,HBO
                SERIES,Valid Series,2022,Comedy,Hulu
                """;

        Path tempFile = createTempCsvFile(csvContent);

        JobParameters jobParameters = new JobParametersBuilder()
                .addString("filePath", tempFile.toString())
                .toJobParameters();

        // Act
        JobExecution jobExecution = jobLauncher.run(mediaItemImportJob, jobParameters);
        waitForCompleted(jobExecution);

        // Assert - Job completed (with skips)
        assertThat(jobExecution.getStatus()).isEqualTo(COMPLETED);

        // Assert - Only valid items were saved (2 out of 3)
        List<MediaItem> allItems = mediaItemRepository.findAll();
        assertThat(allItems).hasSize(2);

        assertThat(mediaItemRepository.findByNameAndCategory("Valid Movie", Category.MOVIE)).isPresent();
        assertThat(mediaItemRepository.findByNameAndCategory("Valid Series", Category.SERIES)).isPresent();

        // Assert - Skip count is correct
        assertThat(jobExecution.getStepExecutions())
                .flatExtracting((Function<? super StepExecution, ?>) StepExecution::getSkipCount)
                .containsExactly(1L);

        // Cleanup
        Files.deleteIfExists(tempFile);
    }

    @Test
    void importJob_WithInvalidName_ShouldSkipInvalidRows() throws Exception {
        // Arrange
        String csvContent = """
                category,name,year,genres,platforms
                GAME,   ,2021,RPG,XBOX
                MOVIE,Valid Movie,2020,Action,Netflix
                SERIES,Valid Series,2022,Comedy,Hulu
                """;

        Path tempFile = createTempCsvFile(csvContent);

        JobParameters jobParameters = new JobParametersBuilder()
                .addString("filePath", tempFile.toString())
                .toJobParameters();

        // Act
        JobExecution jobExecution = jobLauncher.run(mediaItemImportJob, jobParameters);
        waitForCompleted(jobExecution);

        // Assert - Job completed (with skips)
        assertThat(jobExecution.getStatus()).isEqualTo(COMPLETED);

        // Assert - Only valid items were saved (2 out of 3)
        List<MediaItem> allItems = mediaItemRepository.findAll();
        assertThat(allItems).hasSize(2);

        assertThat(mediaItemRepository.findByNameAndCategory("Valid Movie", Category.MOVIE)).isPresent();
        assertThat(mediaItemRepository.findByNameAndCategory("Valid Series", Category.SERIES)).isPresent();

        // Assert - Skip count is correct
        assertThat(jobExecution.getStepExecutions())
                .flatExtracting((Function<? super StepExecution, ?>) StepExecution::getSkipCount)
                .containsExactly(1L);

        // Cleanup
        Files.deleteIfExists(tempFile);
    }

    @Test
    void importJob_WithMissingYear_ShouldNotSaveItem() throws Exception {
        // Arrange
        String csvContent = """
                category,name,year,genres,platforms
                MOVIE,Movie Without Year,,Action,Netflix
                """;

        Path tempFile = createTempCsvFile(csvContent);

        JobParameters jobParameters = new JobParametersBuilder()
                .addString("filePath", tempFile.toString())
                .toJobParameters();

        // Act
        JobExecution jobExecution = jobLauncher.run(mediaItemImportJob, jobParameters);
        waitForCompleted(jobExecution);

        // Assert
        assertThat(jobExecution.getStatus()).isEqualTo(COMPLETED);

        Optional<MediaItem> item = mediaItemRepository.findByNameAndCategory("Movie Without Year", Category.MOVIE);
        assertThat(item).isEmpty();

        // Cleanup
        Files.deleteIfExists(tempFile);
    }

    @Test
    void importJob_ShouldReuseExistingGenresAndPlatforms() throws Exception {
        // Arrange - Pre-create some genres and platforms
        Genre existingAction = new Genre();
        existingAction.setName("Action");
        genreRepository.save(existingAction);

        Platform existingNetflix = new Platform();
        existingNetflix.setName("Netflix");
        platformRepository.save(existingNetflix);

        long genreCountBefore = genreRepository.count();
        long platformCountBefore = platformRepository.count();

        String csvContent = """
                category,name,year,genres,platforms
                MOVIE,Test Movie,2020,"Action,Drama","Netflix,HBO"
                """;

        Path tempFile = createTempCsvFile(csvContent);

        JobParameters jobParameters = new JobParametersBuilder()
                .addString("filePath", tempFile.toString())
                .toJobParameters();

        // Act
        JobExecution jobExecution = jobLauncher.run(mediaItemImportJob, jobParameters);
        waitForCompleted(jobExecution);

        // Assert
        assertThat(jobExecution.getStatus()).isEqualTo(COMPLETED);

        // Assert - Only new genres/platforms were created, existing ones reused
        long genreCountAfter = genreRepository.count();
        long platformCountAfter = platformRepository.count();

        assertThat(genreCountAfter).isEqualTo(genreCountBefore + 1); // Only "Drama" added
        assertThat(platformCountAfter).isEqualTo(platformCountBefore + 1); // Only "HBO" added

        // Cleanup
        Files.deleteIfExists(tempFile);
    }

    private Path createTempCsvFile(String content) throws IOException {
        Path tempFile = Files.createTempFile("test_media_", ".csv");
        Files.writeString(tempFile, content);
        return tempFile;
    }

    private void waitForCompleted(JobExecution jobExecution) throws InterruptedException {
        int currentLoop = 0;
        int maxLoop = 20;
        while (!jobExecution.getStatus().equals(COMPLETED)) {
            currentLoop++;
            if (currentLoop >= maxLoop) {
                break;
            }
            System.out.println("job not completed. sleeping for 50ms");
            Thread.sleep(50);
        }
    }
}