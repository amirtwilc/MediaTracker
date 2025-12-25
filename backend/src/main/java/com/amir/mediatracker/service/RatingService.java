package com.amir.mediatracker.service;

import com.amir.mediatracker.entity.UserMediaList;
import com.amir.mediatracker.kafka.RatingProducer;
import com.amir.mediatracker.kafka.event.RatingEvent;
import com.amir.mediatracker.repository.UserMediaListRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class RatingService {

    @Autowired
    private UserMediaListRepository userMediaListRepository;

    @Autowired
    private RatingProducer ratingProducer;

    @Transactional
    public void rateMedia(Long userId, UserMediaList listItem) {

        // Send Kafka event
        RatingEvent event = new RatingEvent();
        event.setUserId(userId);
        event.setUsername(listItem.getUser().getUsername());
        event.setMediaItemId(listItem.getMediaItem().getId());
        event.setMediaItemName(listItem.getMediaItem().getName());
        event.setRating(listItem.getRating());
        event.setTimestamp(LocalDateTime.now());

        ratingProducer.sendRatingEvent(event);
    }
}
