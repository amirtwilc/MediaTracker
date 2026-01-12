package com.amir.mediatracker.batch.config;

import com.amir.mediatracker.batch.exception.SkippableItemException;
import com.amir.mediatracker.batch.listener.JobCompletionListener;
import com.amir.mediatracker.batch.model.MediaItemCSV;
import com.amir.mediatracker.entity.MediaItem;
import lombok.RequiredArgsConstructor;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.configuration.annotation.StepScope;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.launch.support.RunIdIncrementer;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.item.ItemProcessor;
import org.springframework.batch.item.ItemReader;
import org.springframework.batch.item.ItemWriter;
import org.springframework.batch.item.file.FlatFileItemReader;
import org.springframework.batch.item.file.builder.FlatFileItemReaderBuilder;
import org.springframework.batch.item.file.mapping.BeanWrapperFieldSetMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.FileSystemResource;
import org.springframework.transaction.PlatformTransactionManager;

/**
 * Spring Batch configuration for importing media items from a CSV file.
 *
 * <p>The job reads media items from a delimited CSV file provided via the
 * {@code filePath} job parameter, processes each record, and persists the
 * resulting {@link MediaItem} entities.
 *
 * <p>The job is chunk-oriented and fault-tolerant, allowing selected records
 * to be skipped based on configurable limits.
 */
@Configuration
@RequiredArgsConstructor
public class MediaItemBatchConfig {

    private final MediaItemBatchProperties batchProperties;
    private final JobRepository jobRepository;
    private final PlatformTransactionManager transactionManager;

    @Bean
    public Job mediaItemImportJob(Step importMediaItemStep,
                                  JobCompletionListener listener) {
        return new JobBuilder("mediaItemImportJob", jobRepository)
                .incrementer(new RunIdIncrementer())
                .listener(listener)
                .start(importMediaItemStep)
                .build();
    }

    @Bean
    public Step mediaItemImportStep(ItemReader<MediaItemCSV> reader,
                                    ItemProcessor<MediaItemCSV, MediaItem> processor,
                                    ItemWriter<MediaItem> writer) {
        return new StepBuilder("mediaItemImportStep", jobRepository)
                .<MediaItemCSV, MediaItem>chunk(batchProperties.getChunkSize(), transactionManager)
                .reader(reader)
                .processor(processor)
                .writer(writer)
                .faultTolerant()
                .skip(SkippableItemException.class)
                .skipLimit(batchProperties.getSkipLimit())
                .build();
    }

    @Bean
    @StepScope
    public FlatFileItemReader<MediaItemCSV> reader(
            @Value("#{jobParameters['filePath']}") String filePath) {
        BeanWrapperFieldSetMapper<MediaItemCSV> mapper =
                new BeanWrapperFieldSetMapper<>();
        mapper.setTargetType(MediaItemCSV.class);

        return new FlatFileItemReaderBuilder<MediaItemCSV>()
                .name("mediaItemCSVReader")
                .resource(new FileSystemResource(filePath))
                .delimited()
                .names("category", "name", "year", "genres", "platforms")
                .strict(true) //fail if csv does not contain exactly these columns
                .linesToSkip(1)
                .fieldSetMapper(mapper)
                .recordSeparatorPolicy(new BlankLineRecordSeparatorPolicy())
                .build();
    }
}
