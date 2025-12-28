package com.amir.mediatracker.repository;

import com.amir.mediatracker.entity.UserMediaList;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserMediaListRepository extends JpaRepository<UserMediaList, Long> {
    Page<UserMediaList> findByUserId(Long userId, Pageable pageable);

    Optional<UserMediaList> findByIdAndUserId(Long id, Long userId);

    Optional<UserMediaList> findByUserIdAndMediaItemId(Long userId, Long mediaItemId);

    List<UserMediaList> findAllByMediaItemIdAndRatingIsNotNull(Long mediaItemId);

    long countByUserIdAndRatingIsNotNull(Long userId);
    List<UserMediaList> findByUserIdAndMediaItemIdInAndRatingIsNotNull(
            Long userId, List<Long> mediaItemIds);
}
