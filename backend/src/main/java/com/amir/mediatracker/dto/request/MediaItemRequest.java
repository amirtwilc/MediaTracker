package com.amir.mediatracker.dto.request;

import com.amir.mediatracker.dto.Category;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.Set;

@Data
public class MediaItemRequest {
    @NotNull(message = "Category is required")
    private Category category;

    @NotBlank(message = "Name is required")
    @Size(max = 255)
    private String name;

    @Min(value = 1895, message = "Year must be at least 1895")
    @Max(value = 3000, message = "Year is not allowed")
    private Integer year;

    @NotEmpty(message = "At least one genre is required")
    private Set<Long> genreIds;

    @NotEmpty(message = "At least one platform is required")
    private Set<Long> platformIds;
}
