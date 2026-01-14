package com.amir.mediatracker.repository;

import com.amir.mediatracker.entity.Notification;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId, Limit limit);

    List<Notification> findByUserIdAndIsReadFalseOrderByCreatedAtDesc(Long userId, Limit limit);

    Optional<Notification> findByIdAndUserId(Long id, Long userId);
}
