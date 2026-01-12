package com.amir.mediatracker.graphql.dto.input;

import com.amir.mediatracker.dto.Category;
import lombok.Data;

import java.util.Set;

@Data
public class AvailableFiltersInput {
    private String query;
    private Set<Category> categories;
}
