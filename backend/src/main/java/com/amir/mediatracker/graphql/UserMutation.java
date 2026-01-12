package com.amir.mediatracker.graphql;

import com.amir.mediatracker.aop.LogAround;
import com.amir.mediatracker.dto.request.FollowRequest;
import com.amir.mediatracker.dto.request.UpdateMediaListRequest;
import com.amir.mediatracker.dto.response.UserFollowResponse;
import com.amir.mediatracker.dto.response.UserMediaListResponse;
import com.amir.mediatracker.security.dto.UserPrincipal;
import com.amir.mediatracker.service.FollowService;
import com.amir.mediatracker.service.UserMediaListService;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;

@LogAround
@Controller
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
@RequiredArgsConstructor
public class UserMutation {

    private final UserMediaListService userMediaListService;
    private final FollowService followService;

    @MutationMapping
    public UserMediaListResponse addMediaToList(@Argument Long mediaItemId, @AuthenticationPrincipal UserPrincipal user) {
        return userMediaListService.addMediaToList(user.getId(), mediaItemId);
    }

    @MutationMapping
    public UserMediaListResponse updateMediaListItem(@Argument Long id, @Argument UpdateMediaListRequest request, @AuthenticationPrincipal UserPrincipal user) {
        return userMediaListService.updateMediaListItem(user.getId(), id, request);
    }

    @MutationMapping
    public Boolean removeMediaFromList(@Argument Long id, @AuthenticationPrincipal UserPrincipal user) {
        userMediaListService.removeMediaFromList(user.getId(), id);
        return true;
    }

    @MutationMapping
    public UserFollowResponse followUser(@Argument FollowRequest request, @AuthenticationPrincipal UserPrincipal user) {
        return followService.followUser(user.getId(), request);
    }

    @MutationMapping
    public Boolean unfollowUser(@Argument Long followUserId, @AuthenticationPrincipal UserPrincipal user) {
        followService.unfollowUser(followUserId, user.getId());
        return true;
    }

    @MutationMapping
    public UserFollowResponse updateFollowThreshold(@Argument Long followUserId, @Argument Short threshold, @AuthenticationPrincipal UserPrincipal user) {
        return followService.updateThreshold(user.getId(), followUserId, threshold);
    }
}

