package com.amir.mediatracker.dto.request;

import com.amir.mediatracker.dto.Category;
import lombok.Data;

import java.util.List;

@Data
public class UserSearchRequest {
    private String username;
    private Boolean adminOnly;
    private String sortBy; // "registrationDate", "lastActive", "ratingsCount", "followersCount"
    private String sortDirection; // "asc" or "desc"
    private Category category; // For ratings count filter
    private List<Long> genreIds; // For ratings count filter
    private List<Long> platformIds; // For ratings count filter
    private List<ItemRatingCriteria> itemRatingCriteria; // For advanced search

    @Data
    public static class ItemRatingCriteria {
        private Long mediaItemId;
        private Short minRating;
        private Short maxRating;
    }
}