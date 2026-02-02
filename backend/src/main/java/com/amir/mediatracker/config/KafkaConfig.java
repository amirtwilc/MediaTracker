package com.amir.mediatracker.config;

import lombok.RequiredArgsConstructor;
import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
@RequiredArgsConstructor
public class KafkaConfig {

    private final KafkaTopicProperties kafkaTopicProperties;

    @Bean
    @Profile({"local", "docker"})
    public NewTopic ratingTopic() {
        return TopicBuilder.name(kafkaTopicProperties.getMediaRatingTopic())
                .partitions(kafkaTopicProperties.getTopicPartitions())
                .replicas(kafkaTopicProperties.getTopicReplicas())
                .build();
    }
}
