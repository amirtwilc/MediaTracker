package com.amir.mediatracker.dto.request;

import com.amir.mediatracker.dto.Category;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.Set;

@Data
@Valid
public class MediaItemRequest {
    @NotNull(message = "Category is required")
    private Category category;

    @NotBlank(message = "Name is required")
    @Size(max = 255)
    private String name;

    private Integer year;

    @NotEmpty(message = "At least one genre is required")
    private Set<Long> genreIds;

    @NotEmpty(message = "At least one platform is required")
    private Set<Long> platformIds;
}
