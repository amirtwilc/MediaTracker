package com.amir.mediatracker.controller;

import com.amir.mediatracker.dto.request.UserSearchRequest;
import com.amir.mediatracker.dto.request.UserSettingsRequest;
import com.amir.mediatracker.dto.response.UserMediaListResponse;
import com.amir.mediatracker.dto.response.UserProfileResponse;
import com.amir.mediatracker.dto.response.UserResponse;
import com.amir.mediatracker.dto.response.UserSettingsResponse;
import com.amir.mediatracker.security.dto.UserPrincipal;
import com.amir.mediatracker.service.UserMediaListService;
import com.amir.mediatracker.service.UserSearchService;
import com.amir.mediatracker.service.UserSettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/users")
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserSearchService userSearchService;
    private final UserMediaListService userMediaListService;
    private final UserSettingsService userSettingsService;

    @PostMapping("/search")
    public ResponseEntity<Page<UserProfileResponse>> searchUsers(
            @RequestBody UserSearchRequest request,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        Page<UserProfileResponse> users = userSearchService.searchUsers(
                request, userPrincipal.getId(), page, size);
        return ResponseEntity.ok(users);
    }

    @GetMapping("/{userId}/profile")
    public ResponseEntity<UserProfileResponse> getUserProfile(
            @PathVariable Long userId,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        UserProfileResponse profile = userSearchService.getUserProfile(
                userId, userPrincipal.getId());
        return ResponseEntity.ok(profile);
    }

    @GetMapping("/{userId}/list")
    public ResponseEntity<List<UserMediaListResponse>> getUserMediaList(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        // Check if user is visible
        UserProfileResponse profile = userSearchService.getUserProfile(
                userId, userPrincipal.getId());

        List<UserMediaListResponse> list = userMediaListService.getUserMediaList(
                userId, page, size);
        return ResponseEntity.ok(list);
    }

    @GetMapping("/settings")
    public ResponseEntity<UserSettingsResponse> getSettings(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        UserSettingsResponse settings = userSettingsService.getSettings(userPrincipal.getId());
        return ResponseEntity.ok(settings);
    }

    @PutMapping("/settings")
    public ResponseEntity<UserSettingsResponse> updateSettings(
            @RequestBody @Valid UserSettingsRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        UserSettingsResponse updated = userSettingsService.updateSettings(
                userPrincipal.getId(), request);
        return ResponseEntity.ok(updated);
    }
}