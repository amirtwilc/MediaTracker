package com.amir.mediatracker.dto.response;

import com.amir.mediatracker.dto.Category;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Set;

@Data
@Builder
public class MediaItemResponse {
    private Long id;
    private Category category;
    private String name;
    private Integer year;
    private Set<GenreResponse> genres;
    private Set<PlatformResponse> platforms;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
