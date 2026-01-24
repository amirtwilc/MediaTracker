package com.amir.mediatracker.service;

import com.amir.mediatracker.aop.LogAround;
import com.amir.mediatracker.kafka.RatingProducer;
import com.amir.mediatracker.kafka.event.RatingEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Service
@LogAround
@RequiredArgsConstructor
public class RatingService {

    private final RatingProducer ratingProducer;

    /**
     * Since rating is performed inside a DB transaction,
     * the event must be sent to Kafka only once the transaction has commited.
     * @param event RatingEvent
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleRatingEvent(RatingEvent event) {
        ratingProducer.sendRatingEvent(event);
    }
}
