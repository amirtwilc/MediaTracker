package com.amir.mediatracker.kafka.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RatingEvent {
    private Long userId;
    private String username;
    private Long mediaItemId;
    private String mediaItemName;
    private Short rating;
    private LocalDateTime timestamp;
}
