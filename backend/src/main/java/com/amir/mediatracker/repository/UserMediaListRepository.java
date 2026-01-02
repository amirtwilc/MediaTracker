package com.amir.mediatracker.repository;

import com.amir.mediatracker.dto.Category;
import com.amir.mediatracker.entity.UserMediaList;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface UserMediaListRepository extends JpaRepository<UserMediaList, Long> {
    Page<UserMediaList> findByUserId(Long userId, Pageable pageable);

    Optional<UserMediaList> findByIdAndUserId(Long id, Long userId);

    Optional<UserMediaList> findByUserIdAndMediaItemId(Long userId, Long mediaItemId);

    List<UserMediaList> findAllByMediaItemIdAndRatingIsNotNull(Long mediaItemId);

    long countByUserIdAndRatingIsNotNull(Long userId);

    List<UserMediaList> findByUserIdAndMediaItemIdInAndRatingIsNotNull(
            Long userId, List<Long> mediaItemIds);

    @Query("""
            SELECT uml FROM UserMediaList uml
            JOIN uml.mediaItem m
            LEFT JOIN m.genres g
            LEFT JOIN m.platforms p
            WHERE uml.user.id = :userId
            AND (:searchQuery = '' OR LOWER(m.name) LIKE LOWER(CONCAT('%', :searchQuery, '%')))
            AND (:category IS NULL OR m.category = :category)
            AND (:genreIds IS NULL OR g.id IN :genreIds)
            AND (:platformIds IS NULL OR p.id IN :platformIds)
            AND (:wishToExperience IS FALSE OR (uml.experienced = FALSE OR uml.wishToReexperience = TRUE))
            AND (
                :cursorName = '' OR
                (m.name > :cursorName OR (m.name = :cursorName AND uml.id > :cursorId))
            )
            GROUP BY uml.id, m.id, m.name, m.category, m.year, m.avgRating, m.createdAt, m.updatedAt
            HAVING
                (:genreCount = 0 OR COUNT(DISTINCT g.id) = :genreCount)
            AND (:platformCount = 0 OR COUNT(DISTINCT p.id) = :platformCount)
            ORDER BY m.name ASC, uml.id ASC
            """)
    List<UserMediaList> findByUserIdWithFilters(
            @Param("userId") Long userId,
            @Param("searchQuery") String searchQuery,
            @Param("category") Category category,
            @Param("genreIds") Set<Long> genreIds,
            @Param("platformIds") Set<Long> platformIds,
            @Param("genreCount") long genreCount,
            @Param("platformCount") long platformCount,
            @Param("wishToExperience") boolean wishToExperience,
            @Param("cursorName") String cursorName,
            @Param("cursorId") Long cursorId,
            Pageable pageable
    );

    @Query("""
            SELECT COUNT(DISTINCT uml.id) FROM UserMediaList uml
            JOIN uml.mediaItem m
            LEFT JOIN m.genres g
            LEFT JOIN m.platforms p
            WHERE uml.user.id = :userId
            AND (:searchQuery = '' OR LOWER(m.name) LIKE LOWER(CONCAT('%', :searchQuery, '%')))
            AND (:category IS NULL OR m.category = :category)
            AND (:genreIds IS NULL OR g.id IN :genreIds)
            AND (:platformIds IS NULL OR p.id IN :platformIds)
            AND (:wishToExperience IS FALSE OR (uml.experienced = FALSE OR uml.wishToReexperience = TRUE))
            """)
    Long countByUserIdWithFiltersSimple(
            @Param("userId") Long userId,
            @Param("searchQuery") String searchQuery,
            @Param("category") Category category,
            @Param("genreIds") Set<Long> genreIds,
            @Param("platformIds") Set<Long> platformIds,
            @Param("wishToExperience") boolean wishToExperience
    );

    @Query("SELECT COUNT(uml) FROM UserMediaList uml WHERE uml.user.id = :userId")
    Long countByUserId(@Param("userId") Long userId);
}