package com.amir.mediatracker.service;

import com.amir.mediatracker.kafka.RatingProducer;
import com.amir.mediatracker.kafka.event.RatingEvent;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.context.transaction.TestTransaction;
import org.springframework.transaction.annotation.Transactional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@SpringBootTest(
        properties = {
                "spring.flyway.enabled=false",
                "spring.datasource.url=jdbc:h2:mem:testdb",
                "spring.datasource.driver-class-name=org.h2.Driver"
        }
)
@Transactional
class RatingServiceTest {

    @MockBean
    RatingProducer producer;

    @Autowired
    ApplicationEventPublisher publisher;

    @Test
    void eventSentOnlyAfterCommit() {
        publisher.publishEvent(new RatingEvent());

        verify(producer, never()).sendRatingEvent(any());

        TestTransaction.flagForCommit();
        TestTransaction.end();

        verify(producer).sendRatingEvent(any());
    }

    @Test
    void ratingEvent_isNotSentOnRollback() {

        publisher.publishEvent(new RatingEvent());

        // End without flagging commit → rollback
        TestTransaction.end();

        verify(producer, never()).sendRatingEvent(any());
    }
}

