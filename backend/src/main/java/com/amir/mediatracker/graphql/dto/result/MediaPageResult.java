package com.amir.mediatracker.graphql.dto.result;

import com.amir.mediatracker.dto.response.MediaItemResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MediaPageResult {
    private List<MediaItemResponse> content;
    private int totalPages;
    private long totalElements;
    private int number;
    private int size;
}
