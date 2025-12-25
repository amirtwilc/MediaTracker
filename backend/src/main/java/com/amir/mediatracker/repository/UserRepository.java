package com.amir.mediatracker.repository;

import com.amir.mediatracker.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
/*    Optional<User> findByNameIgnoreCase(String name);

    List<User> findByNameContainingIgnoreCase(String name);*/
    Optional<User> findByUsername(String name);

    Optional<User> findByEmail(String email);

    Boolean existsByUsername(String username);

    boolean existsByEmail(String email);
}
