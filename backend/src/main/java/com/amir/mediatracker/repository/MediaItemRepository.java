package com.amir.mediatracker.repository;

import com.amir.mediatracker.dto.Category;
import com.amir.mediatracker.entity.MediaItem;
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
}
