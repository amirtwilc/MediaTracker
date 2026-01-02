package com.amir.mediatracker.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class UserMediaListSearchResponse {

    private List<UserMediaListResponse> items;

    private Cursor nextCursor;

    private boolean hasMore;

    private long totalCount;

    @Data
    @AllArgsConstructor
    public static class Cursor {
        private String name;
        private Long id;
    }
}