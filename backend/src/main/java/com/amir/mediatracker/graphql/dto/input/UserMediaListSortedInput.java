package com.amir.mediatracker.graphql.dto.input;

import com.amir.mediatracker.dto.Category;
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
    private String sortBy;
    private String sortDirection;
}
