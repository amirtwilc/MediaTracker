package com.amir.mediatracker.graphql.dto.input;

import com.amir.mediatracker.dto.Category;
import lombok.Data;

import java.util.Set;

@Data
public class MyListFiltersInput {
    private String searchQuery;
    private Set<Category> categories;
}
