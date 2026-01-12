package com.amir.mediatracker.graphql.dto.result;

import com.amir.mediatracker.dto.response.UserMediaListResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserMediaListPageResult {
    private List<UserMediaListResponse> content;
    private int totalPages;
    private long totalElements;
    private int number;
    private int size;
}
