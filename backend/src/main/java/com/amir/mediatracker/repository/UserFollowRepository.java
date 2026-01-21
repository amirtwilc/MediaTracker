package com.amir.mediatracker.repository;

import com.amir.mediatracker.entity.UserFollow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserFollowRepository extends JpaRepository<UserFollow, Long> {
    @Query("""
                SELECT uf FROM UserFollow uf
                JOIN FETCH uf.following
                WHERE uf.follower.id = :followerId
            """)
    List<UserFollow> findByFollowerId(Long followerId);

    @Query("""
                SELECT uf FROM UserFollow uf
                JOIN FETCH uf.follower
                WHERE uf.following.id = :followingId
            """)
    List<UserFollow> findByFollowingId(Long followingId);

    Optional<UserFollow> findByFollowerIdAndFollowingId(Long followerId, Long followingId);

    boolean existsByFollowerIdAndFollowingId(Long followerId, Long followingId);
}
