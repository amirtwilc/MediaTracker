package com.amir.mediatracker.graphql.dto.input;

import com.amir.mediatracker.dto.Category;
import lombok.Data;

import java.util.Set;

@Data
public class SearchMediaInput {
    private String query;
    private Set<Category> categories;
    private Set<Long> genreIds;
    private Set<Long> platformIds;
    private String cursorName;
    private Long cursorId;
    private Integer limit;
}
