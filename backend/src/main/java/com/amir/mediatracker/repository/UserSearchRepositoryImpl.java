package com.amir.mediatracker.repository;

import com.amir.mediatracker.dto.ItemRatingCriteria;
import com.amir.mediatracker.dto.Role;
import com.amir.mediatracker.dto.UserSortBy;
import com.amir.mediatracker.dto.response.UserProfileResponse;
import com.amir.mediatracker.exception.BadRequestException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import org.hibernate.query.SortDirection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.List;
import java.util.function.Consumer;

@Repository
@RequiredArgsConstructor
public class UserSearchRepositoryImpl implements UserSearchRepository {

    private static final int IDX_ID = 0;
    private static final int IDX_USERNAME = 1;
    private static final int IDX_EMAIL = 2;
    private static final int IDX_ROLE = 3;
    private static final int IDX_CREATED_AT = 4;
    private static final int IDX_LAST_ACTIVE = 5;
    private static final int IDX_RATINGS_COUNT = 6;
    private static final int IDX_FOLLOWERS_COUNT = 7;
    private static final int IDX_IS_FOLLOWING = 8;

    private final EntityManager em;

    /**
     * Search users by username or return all.
     * Dynamically creates the query depending on the input.
     * @param userId The id of the user that initiated the search. This user will not appear in the result
     * @param username The username to search. Returns all users if empty
     * @param adminOnly If true, only admin users are returned, otherwise (default) all users are returned
     * @param sortBy Possible sorting: REGISTRATION_DATE, LAST_ACTIVE, RATINGS, FOLLOWERS. Default is LAST_ACTIVE
     * @param direction ASCENDING, DESCENDING
     * @param pageable The page to return
     * @return A page of UserProfileResponse
     */
    @Override
    public Page<UserProfileResponse> basicSearch(
            Long userId,
            String username,
            boolean adminOnly,
            UserSortBy sortBy,
            SortDirection direction,
            Pageable pageable
    ) {

        String orderBy = resolveOrderByClause(sortBy, direction);
        String usernameFilter = (username != null)
                ? "AND u.username ILIKE :username"
                : "";

        String sql = """
            SELECT u.id,
                   u.username,
                   CASE WHEN (u.show_email) THEN u.email ELSE NULL END,
                   u.role,
                   u.created_at,
                   u.last_active,
                   COUNT(DISTINCT uml2.rating)        AS ratings_count,
                   COUNT(DISTINCT uf.follower_id)     AS followers_count,
                   EXISTS (
                       SELECT 1
                       FROM user_follows f
                       WHERE f.follower_id = :currentUserId
                         AND f.following_id = u.id
                   )
            FROM users u
            LEFT JOIN user_media_list uml2 ON uml2.user_id = u.id
            LEFT JOIN user_follows uf ON uf.following_id = u.id
            WHERE u.is_invisible = false
              AND u.id <> :currentUserId
              AND (:adminOnly = false OR u.role = 'ADMIN')
              %s
            GROUP BY u.id
            ORDER BY %s
            """.formatted(usernameFilter, orderBy);

        String countSql = """
                SELECT COUNT(DISTINCT u.id)
                FROM users u
                WHERE u.is_invisible = false
                  AND u.id <> :currentUserId
                  AND (:adminOnly = false OR u.role = 'ADMIN')
                  %s
                """.formatted(usernameFilter);

        return executePagedNativeQuery(sql, countSql, pageable, query -> {
            if (username != null) {
                query.setParameter("username", "%" + username + "%");
            }
            query.setParameter("currentUserId", userId);
            query.setParameter("adminOnly", adminOnly);
        });
    }

    /**
     * Search user by the ratings the gave to items.
     * The resulting users must have ALL items in their list and have rated EACH item according to the requested range.
     * Dynamically creates the query depending on the input given and size of criteria.
     * @param userId The id of the user that initiated the search. This user will not appear in the result
     * @param criteria List of items and the requested range for each
     * @param sortBy Possible sorting: REGISTRATION_DATE, LAST_ACTIVE, RATINGS, FOLLOWERS. Default is LAST_ACTIVE
     * @param direction ASCENDING, DESCENDING
     * @param pageable The page to return
     * @return A page of UserProfileResponse
     */
    @Override
    public Page<UserProfileResponse> advancedSearch(
            Long userId,
            List<ItemRatingCriteria> criteria,
            UserSortBy sortBy,
            SortDirection direction,
            Pageable pageable
    ) {

        if (criteria == null || criteria.isEmpty()) {
            throw new BadRequestException("itemRatingCriteria must not be empty");
        }

        StringBuilder where = new StringBuilder();
        for (int i = 0; i < criteria.size(); i++) {
            if (i > 0) where.append(" OR ");
            where.append("""
                (uml.media_item_id = :mediaId%s AND uml.rating BETWEEN :min%s AND :max%s)
            """.formatted(i, i, i));
        }

        String orderBy = resolveOrderByClause(sortBy, direction);

        String sql = """
                WITH matched_users AS (
                    SELECT uml.user_id
                    FROM user_media_list uml
                    WHERE %s
                    GROUP BY uml.user_id
                    HAVING COUNT(DISTINCT uml.media_item_id) = :criteriaCount
                )
                SELECT u.id,
                       u.username,
                       CASE WHEN (u.show_email) THEN u.email ELSE NULL END,
                       u.role,
                       u.created_at,
                       u.last_active,
                       COUNT(DISTINCT uml2.rating)        AS ratings_count,
                       COUNT(DISTINCT uf.follower_id)     AS followers_count,
                       EXISTS (
                           SELECT 1
                           FROM user_follows f
                           WHERE f.follower_id = :currentUserId
                             AND f.following_id = u.id
                       )                                  AS is_following
                FROM matched_users mu
                JOIN users u ON u.id = mu.user_id
                LEFT JOIN user_media_list uml2 ON uml2.user_id = u.id
                LEFT JOIN user_follows uf ON uf.following_id = u.id
                WHERE u.is_invisible = false
                    AND u.id <> :currentUserId
                GROUP BY u.id
                ORDER BY %s
            """.formatted(where, orderBy);

        String countSql = """
            SELECT COUNT(*)
            FROM (
                SELECT uml.user_id
                FROM user_media_list uml
                WHERE %s
                    AND uml.user_id <> :currentUserId
                GROUP BY uml.user_id
                HAVING COUNT(DISTINCT uml.media_item_id) = :criteriaCount
            ) x
            """.formatted(where);

        return executePagedNativeQuery(sql, countSql, pageable, query -> {
            query.setParameter("currentUserId", userId);
            for (int i = 0; i < criteria.size(); i++) {
                ItemRatingCriteria c = criteria.get(i);
                query.setParameter("mediaId" + i, c.mediaItemId());
                query.setParameter("min" + i, c.minRating());
                query.setParameter("max" + i, c.maxRating());
            }
            query.setParameter("criteriaCount", criteria.size());
        });
    }

    private Page<UserProfileResponse> executePagedNativeQuery(
            String sql,
            String countSql,
            Pageable pageable,
            Consumer<Query> paramBinder
    ) {

        Query dataQuery = em.createNativeQuery(sql);
        Query countQuery = em.createNativeQuery(countSql);

        paramBinder.accept(dataQuery);
        paramBinder.accept(countQuery);

        dataQuery.setFirstResult((int) pageable.getOffset());
        dataQuery.setMaxResults(pageable.getPageSize());

        @SuppressWarnings("unchecked")
        List<Object[]> rows = dataQuery.getResultList();
        List<UserProfileResponse> content =
                rows.stream().map(this::mapRowToUserProfile).toList();

        long total = ((Number) countQuery.getSingleResult()).longValue();

        return new PageImpl<>(content, pageable, total);
    }

    private String resolveOrderByClause(UserSortBy sortBy, SortDirection direction) {
        String dir = direction == SortDirection.ASCENDING ? "ASC" : "DESC";

        return switch (sortBy != null ? sortBy : UserSortBy.LAST_ACTIVE) {
            case REGISTRATION_DATE -> "u.created_at " + dir;
            case LAST_ACTIVE -> "u.last_active " + dir + " NULLS LAST";
            case RATINGS -> "ratings_count " + dir;
            case FOLLOWERS -> "followers_count " + dir;
        };
    }

    private UserProfileResponse mapRowToUserProfile(Object[] row) {
        return UserProfileResponse.builder()
                .id(((Number) row[IDX_ID]).longValue())
                .username((String) row[IDX_USERNAME])
                .email((String) row[IDX_EMAIL])
                .role(Role.valueOf((String) row[IDX_ROLE]))
                .createdAt(((Timestamp) row[IDX_CREATED_AT]).toLocalDateTime())
                .lastActive(row[IDX_LAST_ACTIVE] != null ? ((Timestamp) row[IDX_LAST_ACTIVE]).toLocalDateTime() : null)
                .ratingsCount(((Number) row[IDX_RATINGS_COUNT]).longValue())
                .followersCount(((Number) row[IDX_FOLLOWERS_COUNT]).longValue())
                .isFollowing((Boolean) row[IDX_IS_FOLLOWING])
                .build();
    }
}

