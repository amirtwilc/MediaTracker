package com.amir.mediatracker.repository;

import com.amir.mediatracker.dto.ItemRatingCriteria;
import com.amir.mediatracker.dto.UserSortBy;
import com.amir.mediatracker.dto.response.UserProfileResponse;
import com.amir.mediatracker.entity.User;
import org.hibernate.query.SortDirection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserSearchRepository {

    Page<UserProfileResponse> basicSearch(
            Long userId,
            String username,
            boolean adminOnly,
            UserSortBy sortBy,
            SortDirection direction,
            Pageable pageable
    );

    Page<UserProfileResponse> advancedSearch(
            Long userId,
            List<ItemRatingCriteria> criteria,
            UserSortBy sortBy,
            SortDirection direction,
            Pageable pageable
    );
}

