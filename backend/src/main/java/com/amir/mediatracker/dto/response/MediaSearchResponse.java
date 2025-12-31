package com.amir.mediatracker.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class MediaSearchResponse {

    private List<MediaItemResponse> items;

    private Cursor nextCursor;

    private boolean hasMore;

    @Data
    @AllArgsConstructor
    public static class Cursor {
        private String name;
        private Long id;
    }
}

