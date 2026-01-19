package com.amir.mediatracker.dto.request;

import com.amir.mediatracker.dto.ItemRatingCriteria;
import com.amir.mediatracker.dto.UserSortBy;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import org.hibernate.query.SortDirection;

import java.util.List;

public record AdvancedUserSearchRequest(
        @NotEmpty
        List<@Valid ItemRatingCriteria> itemRatingCriteria,
        UserSortBy sortBy,
        SortDirection sortDirection,
        int page,
        int size
) {}
