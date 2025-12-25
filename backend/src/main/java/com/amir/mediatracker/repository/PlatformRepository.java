package com.amir.mediatracker.repository;

import com.amir.mediatracker.entity.Platform;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlatformRepository extends JpaRepository<Platform, Long> {
    /**
     * Finds a platform by name.
     * @param name the name of the platform to find
     * @return an optional containing the platform if found, otherwise an empty optional
     */
    Optional<Platform> findByNameIgnoreCase(String name);

    /**
     * Finds all platforms containing the given name.
     * @param name the name to search for
     * @return a list of platforms containing the given name
     */
    List<Platform> findByNameContainingIgnoreCase(String name);
}
