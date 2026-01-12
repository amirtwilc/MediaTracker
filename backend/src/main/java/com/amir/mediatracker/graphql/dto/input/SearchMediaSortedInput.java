package com.amir.mediatracker.graphql.dto.input;

import com.amir.mediatracker.dto.Category;
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
    private String sortBy;
    private String sortDirection;
}
