package com.amir.mediatracker.dto.response;

import com.amir.mediatracker.dto.Role;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class UserProfileResponse {
    private Long id;
    private String username;
    private String email;
    private Role role;
    private LocalDateTime createdAt;
    private LocalDateTime lastActive;
    private Long ratingsCount;
    private Long followersCount;
    private Boolean isFollowing; // Whether current user follows this user
}