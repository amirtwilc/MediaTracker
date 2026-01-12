package com.amir.mediatracker.batch.config;

import jakarta.validation.constraints.Min;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.annotation.Validated;

@Data
@Validated
@Configuration
@ConfigurationProperties(prefix = "app.batch")
public class MediaItemBatchProperties {

    @Min(1)
    private int chunkSize = 100;

    @Min(0)
    private int skipLimit = 10;
}

