package com.amir.mediatracker.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Valid
public class GenreRequest {
    @NotBlank(message = "Genre name is required")
    @Size(max = 100)
    private String name;
}
