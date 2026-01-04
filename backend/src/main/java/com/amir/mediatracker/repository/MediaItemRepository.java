package com.amir.mediatracker.repository;

import com.amir.mediatracker.dto.Category;
import com.amir.mediatracker.entity.Genre;
import com.amir.mediatracker.entity.MediaItem;
import com.amir.mediatracker.entity.Platform;
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
public interface MediaItemRepository extends JpaRepository<MediaItem, Long> {
    Optional<MediaItem> findByNameAndCategory(String name, Category category);

    Page<MediaItem> findByNameContainingIgnoreCase(String name, Pageable pageable);

    Page<MediaItem> findByNameContainingIgnoreCaseAndCategory(String name, Category category, Pageable pageable);

    @Query("SELECT DISTINCT m FROM MediaItem m JOIN m.genres g WHERE LOWER(m.name) LIKE LOWER(CONCAT('%', :name, '%')) AND g.id IN :genreIds")
    List<MediaItem> searchByNameAndGenres(@Param("name") String name, @Param("genreIds") Set<Long> genreIds);

    @Query("SELECT DISTINCT m FROM MediaItem m JOIN m.platforms p WHERE LOWER(m.name) LIKE LOWER(CONCAT('%', :name, '%')) AND p.id IN :platformIds")
    List<MediaItem> searchByNameAndPlatforms(@Param("name") String name, @Param("platformIds") Set<Long> platformIds);

    @Query("""
            SELECT m FROM MediaItem m
            WHERE LOWER(m.name) LIKE LOWER(CONCAT('%', :name, '%'))
            AND (:category IS NULL OR m.category = :category)
            AND (
                :cursorName IS NULL OR
                (m.name > :cursorName OR (m.name = :cursorName AND m.id > :cursorId))
            )
            ORDER BY m.name ASC, m.id ASC
            """)
    List<MediaItem> searchWithCursor(
            @Param("name") String name,
            @Param("category") Category category,
            @Param("cursorName") String cursorName,
            @Param("cursorId") Long cursorId,
            Pageable pageable
    );

    @Query("""
        SELECT DISTINCT m FROM MediaItem m
        LEFT JOIN m.genres g
        LEFT JOIN m.platforms p
        WHERE LOWER(m.name) LIKE LOWER(CONCAT('%', :name, '%'))
        AND (:categories IS NULL OR m.category IN :categories)
        AND (:genreIds IS NULL OR EXISTS (
            SELECT 1 FROM MediaItem m2
            JOIN m2.genres g2
            WHERE m2.id = m.id
            AND g2.id IN :genreIds
            GROUP BY m2.id
            HAVING COUNT(DISTINCT g2.id) = :genreCount
        ))
        AND (:platformIds IS NULL OR EXISTS (
            SELECT 1 FROM MediaItem m3
            JOIN m3.platforms p3
            WHERE m3.id = m.id
            AND p3.id IN :platformIds
            GROUP BY m3.id
            HAVING COUNT(DISTINCT p3.id) = :platformCount
        ))
        AND (
            :cursorName IS NULL OR
            (m.name > :cursorName OR (m.name = :cursorName AND m.id > :cursorId))
        )
        ORDER BY m.name ASC, m.id ASC
        """)
    List<MediaItem> searchWithCursorAndFilters(
            @Param("name") String name,
            @Param("categories") Set<Category> categories,
            @Param("genreIds") Set<Long> genreIds,
            @Param("platformIds") Set<Long> platformIds,
            @Param("genreCount") long genreCount,
            @Param("platformCount") long platformCount,
            @Param("cursorName") String cursorName,
            @Param("cursorId") Long cursorId,
            Pageable pageable
    );

    @Query("""
        SELECT DISTINCT m FROM MediaItem m
        LEFT JOIN m.genres g
        LEFT JOIN m.platforms p
        WHERE LOWER(m.name) LIKE LOWER(CONCAT('%', :name, '%'))
        AND (:categories IS NULL OR m.category IN :categories)
        AND (:genreIds IS NULL OR EXISTS (
            SELECT 1 FROM MediaItem m2
            JOIN m2.genres g2
            WHERE m2.id = m.id
            AND g2.id IN :genreIds
            GROUP BY m2.id
            HAVING COUNT(DISTINCT g2.id) = :genreCount
        ))
        AND (:platformIds IS NULL OR EXISTS (
            SELECT 1 FROM MediaItem m3
            JOIN m3.platforms p3
            WHERE m3.id = m.id
            AND p3.id IN :platformIds
            GROUP BY m3.id
            HAVING COUNT(DISTINCT p3.id) = :platformCount
        ))
        """)
    Page<MediaItem> searchWithOffsetAndFilters(
            @Param("name") String name,
            @Param("categories") Set<Category> categories,
            @Param("genreIds") Set<Long> genreIds,
            @Param("platformIds") Set<Long> platformIds,
            @Param("genreCount") long genreCount,
            @Param("platformCount") long platformCount,
            Pageable pageable
    );

    @Query("""
        SELECT COUNT(DISTINCT m.id) FROM MediaItem m
        LEFT JOIN m.genres g
        LEFT JOIN m.platforms p
        WHERE LOWER(m.name) LIKE LOWER(CONCAT('%', :name, '%'))
        AND (:categories IS NULL OR m.category IN :categories)
        AND (:genreIds IS NULL OR g.id IN :genreIds)
        AND (:platformIds IS NULL OR p.id IN :platformIds)
        """)
    Long countWithFiltersSimple(
            @Param("name") String name,
            @Param("categories") Set<Category> categories,
            @Param("genreIds") Set<Long> genreIds,
            @Param("platformIds") Set<Long> platformIds
    );

    @Query("""
        SELECT COUNT(m) FROM MediaItem m
        WHERE LOWER(m.name) LIKE LOWER(CONCAT('%', :name, '%'))
        AND (:categories IS NULL OR m.category IN :categories)
        """)
    Long countSimple(
            @Param("name") String name,
            @Param("categories") Set<Category> categories
    );

    @Query("""
        SELECT DISTINCT g FROM MediaItem m
        JOIN m.genres g
        WHERE LOWER(m.name) LIKE LOWER(CONCAT('%', :name, '%'))
        AND (:categories IS NULL OR m.category IN :categories)
        ORDER BY g.name ASC
        """)
    List<Genre> findDistinctGenresByFilters(
            @Param("name") String name,
            @Param("categories") Set<Category> categories
    );

    @Query("""
        SELECT DISTINCT p FROM MediaItem m
        JOIN m.platforms p
        WHERE LOWER(m.name) LIKE LOWER(CONCAT('%', :name, '%'))
        AND (:categories IS NULL OR m.category IN :categories)
        ORDER BY p.name ASC
        """)
    List<Platform> findDistinctPlatformsByFilters(
            @Param("name") String name,
            @Param("categories") Set<Category> categories
    );

}
