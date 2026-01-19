package com.amir.mediatracker.controller;

import com.amir.mediatracker.aop.LogAround;
import com.amir.mediatracker.dto.UserSortBy;
import com.amir.mediatracker.dto.request.AdvancedUserSearchRequest;
import com.amir.mediatracker.dto.request.BasicUserSearchRequest;
import com.amir.mediatracker.dto.request.UserSearchRequest;
import com.amir.mediatracker.dto.request.UserSettingsRequest;
import com.amir.mediatracker.dto.response.UserMediaListResponse;
import com.amir.mediatracker.dto.response.UserProfileResponse;
import com.amir.mediatracker.dto.response.UserResponse;
import com.amir.mediatracker.dto.response.UserSettingsResponse;
import com.amir.mediatracker.entity.User;
import com.amir.mediatracker.security.dto.UserPrincipal;
import com.amir.mediatracker.service.UserMediaListService;
import com.amir.mediatracker.service.UserSearchService;
import com.amir.mediatracker.service.UserSettingsService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.hibernate.query.SortDirection;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@LogAround
@RestController
@RequestMapping("/users")
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserSearchService userSearchService;
    private final UserMediaListService userMediaListService;
    private final UserSettingsService userSettingsService;

    /**
     * Search users by username or return all.
     * Only returns visible users.
     * Supports filtering by admin/user and sorting by registration date, last active, ratings, followers
     * @param username The username to search. Returns all users if empty
     * @param adminOnly If true, only admin users are returned, otherwise (default) all users are returned
     * @param sortBy Possible sorting: REGISTRATION_DATE, LAST_ACTIVE, RATINGS, FOLLOWERS. Default is LAST_ACTIVE
     * @param sortDirection ASCENDING, DESCENDING
     * @param page The page to return
     * @param size The size of page to return
     * @param userPrincipal The user principal
     * @return Page of UserProfileResponse
     */
    @GetMapping("/search/basic")
    public Page<UserProfileResponse> basicSearch(
            @Size(max = 50) @RequestParam(required = false) String username,
            @RequestParam(defaultValue = "false") boolean adminOnly,
            @RequestParam(required = false) UserSortBy sortBy,
            @RequestParam(required = false) SortDirection sortDirection,
            @Min(0) @RequestParam(defaultValue = "0") int page,
            @Min(1) @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        return userSearchService.basicSearch(userPrincipal.getId(), new BasicUserSearchRequest(
                username,
                adminOnly,
                sortBy,
                sortDirection,
                page,
                size
        ));
    }

    /**
     * Search user by the ratings the gave to items.
     * Supports up to 5 items (parameterized, may be changed).
     * The resulting users must have ALL items in their list and have rated EACH item according to the requested range
     * @param request AdvancedUserSearchRequest
     * @param userPrincipal The user principal
     * @return Page of UserProfileResponse
     */
    @PostMapping("/search/advanced")
    public Page<UserProfileResponse> advancedSearch(
            @Valid @RequestBody AdvancedUserSearchRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        return userSearchService.advancedSearch(userPrincipal.getId(), request);
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