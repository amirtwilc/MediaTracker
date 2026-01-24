package com.amir.mediatracker.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "media_item_id", "rating"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private String message;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "media_item_id", nullable = false)
    private MediaItem mediaItem;

    private Short rating;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "rated_by_user_id", nullable = false)
    private User ratedByUser;

    private Boolean isRead = false;

    @CreatedDate
    private LocalDateTime createdAt;
}
