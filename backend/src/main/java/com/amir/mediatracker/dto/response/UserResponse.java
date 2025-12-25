package com.amir.mediatracker.dto.response;

import com.amir.mediatracker.dto.Role;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserResponse {
    private Long id;
    private String username;
    private String email;
    private Role role;
}
