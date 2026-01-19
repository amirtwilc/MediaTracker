package com.amir.mediatracker.dto.request;

import com.amir.mediatracker.dto.UserSortBy;
import org.hibernate.query.SortDirection;

public record BasicUserSearchRequest(
        String username,
        boolean adminOnly,
        UserSortBy sortBy,
        SortDirection sortDirection,
        int page,
        int size
) {}
