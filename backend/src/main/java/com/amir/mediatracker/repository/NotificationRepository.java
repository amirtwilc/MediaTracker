package com.amir.mediatracker.repository;

import com.amir.mediatracker.entity.Notification;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId, Limit limit);

    List<Notification> findByUserIdAndIsReadFalseOrderByCreatedAtDesc(Long userId, Limit limit);

    Optional<Notification> findByIdAndUserId(Long id, Long userId);

    @Modifying
    @Query(
            value = """
            INSERT INTO notifications
            (user_id, media_item_id, rating, message, rated_by_user_id, is_read, created_at)
            VALUES (:userId, :mediaItemId, :rating, :message, :ratedByUserId, false, now())
            ON CONFLICT (user_id, media_item_id, rating) DO NOTHING
        """,
            nativeQuery = true
    )
    int insertIfNotExists(
            @Param("userId") Long userId,
            @Param("ratedByUserId") Long ratedByUserId,
            @Param("mediaItemId") Long mediaItemId,
            @Param("rating") Short rating,
            @Param("message") String message
    );
}
