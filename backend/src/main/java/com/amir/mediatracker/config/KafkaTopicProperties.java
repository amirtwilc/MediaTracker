package com.amir.mediatracker.config;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.annotation.Validated;

@Data
@Validated
@Configuration
@ConfigurationProperties(prefix = "spring.kafka.topics")
public class KafkaTopicProperties {

    @NotBlank
    private String mediaRatingTopic;

    @Min(1)
    private int topicPartitions = 1;

    @Min(1)
    private int topicReplicas = 1;
}

