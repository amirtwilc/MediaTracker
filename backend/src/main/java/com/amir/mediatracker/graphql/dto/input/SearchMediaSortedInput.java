package com.amir.mediatracker.graphql.dto.input;

import com.amir.mediatracker.dto.Category;
import com.amir.mediatracker.dto.SearchMediaSortBy;
import com.amir.mediatracker.dto.SortDirection;
import lombok.Data;

import java.util.Set;

@Data
public class SearchMediaSortedInput {
    private String query;
    private Set<Category> categories;
    private Set<Long> genreIds;
    private Set<Long> platformIds;
    private Integer page;
    private Integer size;
    private SearchMediaSortBy sortBy;
    private SortDirection sortDirection;

    public Integer getPageOrDefault() {
        return page == null ? 0 : page;
    }

    public Integer getSizeOrDefault() {
        return size == null ? 20 : size;
    }

    public SearchMediaSortBy getSortyByOrDefault() {
        return sortBy == null ? SearchMediaSortBy.NAME: sortBy;
    }

    public SortDirection getSortyDirectionOrDefault() {
        return sortDirection == null ? SortDirection.ASC: sortDirection;
    }
}
