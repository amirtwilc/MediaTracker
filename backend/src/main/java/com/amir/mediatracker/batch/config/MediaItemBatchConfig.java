package com.amir.mediatracker.batch.config;

import com.amir.mediatracker.batch.listener.JobCompletionListener;
import com.amir.mediatracker.batch.model.MediaItemCSV;
import com.amir.mediatracker.batch.processor.MediaItemProcessor;
import com.amir.mediatracker.batch.writer.MediaItemWriter;
import com.amir.mediatracker.entity.MediaItem;
import com.amir.mediatracker.repository.MediaItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.configuration.annotation.StepScope;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.item.ItemProcessor;
import org.springframework.batch.item.ItemReader;
import org.springframework.batch.item.ItemWriter;
import org.springframework.batch.item.file.FlatFileItemReader;
import org.springframework.batch.item.file.builder.FlatFileItemReaderBuilder;
import org.springframework.batch.item.file.mapping.BeanWrapperFieldSetMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.FileSystemResource;
import org.springframework.transaction.PlatformTransactionManager;

@Configuration
@RequiredArgsConstructor
public class MediaItemBatchConfig {

    @Value("${spring.batch.params.chunk-size}")
    private Integer chunkSize;

    @Value("${spring.batch.params.skip-limit}")
    private Integer skipLimit;

    private final JobRepository jobRepository;

    private final PlatformTransactionManager transactionManager;

    @Bean
    public Job importMediaItemJob(Step importMediaItemStep,
                                  JobCompletionListener listener) {
        return new JobBuilder("importMediaItemJob", jobRepository)
                .listener(listener)
                .start(importMediaItemStep)
                .build();
    }

    @Bean
    public Step importMediaItemStep(ItemReader<MediaItemCSV> reader,
                                    ItemProcessor<MediaItemCSV, MediaItem> processor,
                                    ItemWriter<MediaItem> writer) {
        return new StepBuilder("importMediaItemStep", jobRepository)
                .<MediaItemCSV, MediaItem>chunk(chunkSize, transactionManager)
                .reader(reader)
                .processor(processor)
                .writer(writer)
                .faultTolerant()
                .skipLimit(skipLimit)
                .skip(Exception.class)
                .build();
    }

    @Bean
    @StepScope
    public FlatFileItemReader<MediaItemCSV> reader(
            @Value("#{jobParameters['filePath']}") String filePath) {
        return new FlatFileItemReaderBuilder<MediaItemCSV>()
                .name("mediaItemCSVReader")
                .resource(new FileSystemResource(filePath))
                .delimited()
                .names("category", "name", "genres", "platforms")
                .linesToSkip(1)
                .fieldSetMapper(new BeanWrapperFieldSetMapper<>() {{
                    setTargetType(MediaItemCSV.class);
                }})
                .build();
    }
}
