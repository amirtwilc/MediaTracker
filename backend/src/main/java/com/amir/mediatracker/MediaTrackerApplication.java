package com.amir.mediatracker;

import org.springframework.batch.core.configuration.annotation.EnableBatchProcessing;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;

@EnableAsync
@EnableJpaAuditing
@SpringBootApplication
@EnableBatchProcessing
public class MediaTrackerApplication {

	public static void main(String[] args) {
		SpringApplication.run(MediaTrackerApplication.class, args);
	}

}
