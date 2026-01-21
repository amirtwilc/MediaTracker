package com.amir.mediatracker.graphql.dto.input;

import com.amir.mediatracker.dto.Category;
import com.amir.mediatracker.dto.SortDirection;
import com.amir.mediatracker.dto.UserSearchMediaSortBy;
import lombok.Data;

import java.util.Set;

@Data
public class UserMediaListSortedInput {
    private Long displayUserId;
    private String searchQuery;
    private Set<Category> categories;
    private Set<Long> genreIds;
    private Set<Long> platformIds;
    private Boolean wishToExperience;
    private Integer page;
    private Integer size;
    private UserSearchMediaSortBy sortBy;
    private SortDirection sortDirection;

    public Integer getPageOrDefault() {
        return page == null ? 0 : page;
    }

    public Integer getSizeOrDefault() {
        return size == null ? 20 : size;
    }

    public UserSearchMediaSortBy getSortByOrDefault() {
        return sortBy == null ? UserSearchMediaSortBy.NAME: sortBy;
    }

    public SortDirection getSortDirectionOrDefault() {
        return sortDirection == null ? SortDirection.ASC: sortDirection;
    }
}
