package com.amir.mediatracker.repository;

import com.amir.mediatracker.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String name);

    Boolean existsByUsername(String username);

    boolean existsByEmail(String email);
}
