package com.amir.mediatracker.kafka;

import com.amir.mediatracker.kafka.event.RatingEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class RatingProducer {

    @Autowired
    private KafkaTemplate<Long, RatingEvent> kafkaTemplate;

    private static final String TOPIC = "media-ratings";

    public void sendRatingEvent(RatingEvent event) {
        log.info("Sending rating event: userId={}, mediaItemId={}, rating={}",
                event.getUserId(), event.getMediaItemId(), event.getRating());

        kafkaTemplate.send(TOPIC, event.getUserId(), event)
                .whenComplete((result, ex) -> {
                    if (ex == null) {
                        log.info("Rating event sent successfully");
                    } else {
                        log.error("Failed to send rating event", ex);
                    }
                });
    }
}
