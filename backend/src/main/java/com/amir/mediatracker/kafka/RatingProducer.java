package com.amir.mediatracker.kafka;

import com.amir.mediatracker.config.KafkaTopicProperties;
import com.amir.mediatracker.kafka.event.RatingEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class RatingProducer {

    private final KafkaTemplate<Long, RatingEvent> kafkaTemplate;
    private final KafkaTopicProperties kafkaTopicProperties;

    public void sendRatingEvent(RatingEvent event) {
        log.debug("Sending rating event: userId={}, mediaItemId={}, rating={}",
                event.getUserId(), event.getMediaItemId(), event.getRating());

        kafkaTemplate.send(kafkaTopicProperties.getMediaRatingTopic(), event.getUserId(), event)
                .whenComplete((_, ex) -> {
                    if (ex == null) {
                        log.debug("Rating event sent successfully");
                    } else {
                        log.debug("Failed to send rating event", ex);
                    }
                });
    }
}
