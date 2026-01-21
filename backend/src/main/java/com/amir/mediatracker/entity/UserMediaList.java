package com.amir.mediatracker.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_media_list")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class UserMediaList {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "media_item_id", nullable = false)
    private MediaItem mediaItem;

    private Boolean experienced = false;
    private Boolean wishToReexperience = false;
    private Short rating;

    @Column(name = "comment", length = 100)
    private String comment;

    @CreatedDate
    private LocalDateTime addedAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
