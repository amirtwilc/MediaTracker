package com.amir.mediatracker.repository;

import com.amir.mediatracker.entity.User;
import com.amir.mediatracker.entity.UserProfileStats;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String name);

    Boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    @Query("""
        SELECT new com.amir.mediatracker.entity.UserProfileStats(
            /* ratingsCount */
            (SELECT COUNT(uml)
             FROM UserMediaList uml
             WHERE uml.user.id = :profileUserId
               AND uml.rating IS NOT NULL),
    
            /* followersCount */
            (SELECT COUNT(uf)
             FROM UserFollow uf
             WHERE uf.following.id = :profileUserId),
    
            /* isFollowing */
            (CASE
                WHEN EXISTS (
                    SELECT 1
                    FROM UserFollow uf2
                    WHERE uf2.follower.id = :currentUserId
                      AND uf2.following.id = :profileUserId
                )
                THEN TRUE
                ELSE FALSE
             END)
        )
        FROM User u
        WHERE u.id = :profileUserId
    """)
    UserProfileStats fetchUserProfileStats(
            @Param("profileUserId") Long profileUserId,
            @Param("currentUserId") Long currentUserId
    );
}
