package com.amir.mediatracker.controller;

import com.amir.mediatracker.aop.LogAround;
import com.amir.mediatracker.dto.Category;
import com.amir.mediatracker.dto.request.AddMediaRequest;
import com.amir.mediatracker.dto.request.FollowRequest;
import com.amir.mediatracker.dto.request.UpdateMediaListRequest;
import com.amir.mediatracker.dto.request.UpdateThresholdRequest;
import com.amir.mediatracker.dto.response.*;
import com.amir.mediatracker.security.dto.UserPrincipal;
import com.amir.mediatracker.service.FollowService;
import com.amir.mediatracker.service.MediaItemService;
import com.amir.mediatracker.service.UserMediaListService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/media-tracker/user")
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
public class UserController {

    @Autowired
    private UserMediaListService userMediaListService;

    @Autowired
    private MediaItemService mediaItemService;

    @Autowired
    private FollowService followService;

    // Search media items
    @LogAround
    @GetMapping("/media-items/search")
    public ResponseEntity<MediaSearchResponse> searchMediaItems(
            @RequestParam String query,
            @RequestParam(required = false) Set<Category> categories,
            @RequestParam(required = false) Set<Long> genreIds,
            @RequestParam(required = false) Set<Long> platformIds,
            @RequestParam(required = false) String cursorName,
            @RequestParam(required = false) Long cursorId,
            @RequestParam(defaultValue = "20") int limit
    ) {
        // For now, if multiple categories are provided, we'll need to handle this differently
        // Let's pass null category if more than one is selected, and filter client-side
        Category singleCategory = (categories != null && categories.size() == 1)
                ? categories.iterator().next()
                : null;

        return ResponseEntity.ok(
                mediaItemService.searchMediaItemsCursor(
                        query,
                        singleCategory,
                        genreIds,
                        platformIds,
                        cursorName,
                        cursorId,
                        limit
                )
        );
    }

    // Get user's media list
    @LogAround
    @GetMapping("/my-list")
    public ResponseEntity<List<UserMediaListResponse>> getMyMediaList(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Long userId = userPrincipal.getId();
        return ResponseEntity.ok(userMediaListService.getUserMediaList(userId, page, size));
    }

    @LogAround
    @GetMapping("/my-list/cursor")
    public ResponseEntity<UserMediaListSearchResponse> getMyMediaListCursor(
            @RequestParam(required = false) String searchQuery,
            @RequestParam(required = false) Category category,
            @RequestParam(required = false) Set<Long> genreIds,
            @RequestParam(required = false) Set<Long> platformIds,
            @RequestParam(required = false) Boolean wishToExperience,
            @RequestParam(required = false) String cursorName,
            @RequestParam(required = false) Long cursorId,
            @RequestParam(defaultValue = "20") int limit,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Long userId = userPrincipal.getId();
        return ResponseEntity.ok(
                userMediaListService.getUserMediaListCursor(
                        userId,
                        searchQuery,
                        category,
                        genreIds,
                        platformIds,
                        wishToExperience,
                        cursorName,
                        cursorId,
                        limit
                )
        );
    }

    // Add media to user's list
    @LogAround
    @PostMapping("/my-list")
    public ResponseEntity<UserMediaListResponse> addMediaToList(
            @RequestBody @Valid AddMediaRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Long userId = userPrincipal.getId();
        return ResponseEntity.ok(
                userMediaListService.addMediaToList(userId, request.getMediaItemId())
        );
    }

    // Update media in user's list
    @LogAround
    @PutMapping("/my-list/{id}")
    public ResponseEntity<UserMediaListResponse> updateMediaListItem(
            @PathVariable Long id,
            @RequestBody @Valid UpdateMediaListRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Long userId = userPrincipal.getId();
        return ResponseEntity.ok(
                userMediaListService.updateMediaListItem(userId, id, request)
        );
    }

    // Delete media from user's list
    @LogAround
    @DeleteMapping("/my-list/{id}")
    public ResponseEntity<Void> removeMediaFromList(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Long userId = userPrincipal.getId();
        userMediaListService.removeMediaFromList(userId, id);
        return ResponseEntity.noContent().build();
    }

    // Follow a user
    @LogAround
    @PostMapping("/follow")
    public ResponseEntity<UserFollowResponse> followUser(
            @RequestBody @Valid FollowRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Long userId = userPrincipal.getId();
        return ResponseEntity.ok(followService.followUser(userId, request));
    }

    // Unfollow a user
    @LogAround
    @DeleteMapping("/follow/{followUserId}")
    public ResponseEntity<Void> unfollowUser(
            @PathVariable Long followUserId,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Long userId = userPrincipal.getId();
        followService.unfollowUser(followUserId, userId);
        return ResponseEntity.noContent().build();
    }

    // Update follow threshold
    @LogAround
    @PutMapping("/follow/{followUserId}/threshold")
    public ResponseEntity<UserFollowResponse> updateFollowThreshold(
            @PathVariable Long followUserId,
            @RequestBody @Valid UpdateThresholdRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Long userId = userPrincipal.getId();
        return ResponseEntity.ok(
                followService.updateThreshold(userId, followUserId, request.getThreshold())
        );
    }

    // Get my followers
    @LogAround
    @GetMapping("/followers")
    public ResponseEntity<List<UserResponse>> getMyFollowers(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Long userId = userPrincipal.getId();
        return ResponseEntity.ok(followService.getFollowers(userId));
    }

    // Get users I'm following
    @LogAround
    @GetMapping("/following")
    public ResponseEntity<List<UserFollowResponse>> getMyFollowing(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Long userId = userPrincipal.getId();
        return ResponseEntity.ok(followService.getFollowing(userId));
    }
}
