package com.amir.mediatracker.repository;

import com.amir.mediatracker.entity.Genre;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GenreRepository extends JpaRepository<Genre, Long> {
    Optional<Genre> findByNameIgnoreCase(String name);

    List<Genre> findByNameContainingIgnoreCase(String name);
}
