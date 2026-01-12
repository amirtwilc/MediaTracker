package com.amir.mediatracker.graphql.dto.input;

import com.amir.mediatracker.dto.Category;
import lombok.Data;

import java.util.Set;

@Data
public class MyMediaListInput {
    private String searchQuery;
    private Set<Category> categories;
    private Set<Long> genreIds;
    private Set<Long> platformIds;
    private Boolean wishToExperience;
    private String cursorName;
    private Long cursorId;
    private Integer limit;
}
