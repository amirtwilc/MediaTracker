package com.amir.mediatracker.security.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class JwtAuthenticationResponse {
    private String accessToken;
    private Long userId;
    private String username;
    private String email;
    private String role;
    private String tokenType = "Bearer";

    public JwtAuthenticationResponse(String accessToken, Long userId,
                                     String username, String email, String role) {
        this.accessToken = accessToken;
        this.userId = userId;
        this.username = username;
        this.email = email;
        this.role = role;
    }
}
