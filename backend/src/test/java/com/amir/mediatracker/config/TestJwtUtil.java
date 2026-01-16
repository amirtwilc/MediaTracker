package com.amir.mediatracker.config;

import com.amir.mediatracker.dto.Role;
import com.amir.mediatracker.entity.User;
import com.amir.mediatracker.security.JwtTokenProvider;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.Collections;

public final class TestJwtUtil {

    private TestJwtUtil() {}

    public static User initUser() {
        User user = new User();
        user.setUsername("user");
        user.setEmail("user@example.com");
        user.setPasswordHash("password");
        user.setRole(Role.USER);
        return user;
    }

    public static User initAdmin() {
        User user = new User();
        user.setUsername("admin");
        user.setEmail("admin@example.com");
        user.setPasswordHash("password");
        user.setRole(Role.ADMIN);
        return user;
    }

    public static String token(
            JwtTokenProvider provider,
            String username,
            String role
    ) {

        org.springframework.security.core.userdetails.User newUser =
                new org.springframework.security.core.userdetails.User(
                        username,
                        "password",
                        Collections.singletonList(new SimpleGrantedAuthority(role))
                );

        Authentication userAuth = new UsernamePasswordAuthenticationToken(
                newUser,
                null,
                newUser.getAuthorities()
        );
        return provider.generateToken(userAuth);
    }
}
