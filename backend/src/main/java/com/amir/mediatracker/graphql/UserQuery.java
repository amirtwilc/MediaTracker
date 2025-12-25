package com.amir.mediatracker.graphql;

import com.amir.mediatracker.dto.Category;
import com.amir.mediatracker.dto.response.MediaItemResponse;
import com.amir.mediatracker.dto.response.UserFollowResponse;
import com.amir.mediatracker.dto.response.UserMediaListResponse;
import com.amir.mediatracker.dto.response.UserResponse;
import com.amir.mediatracker.security.dto.UserPrincipal;
import com.amir.mediatracker.service.FollowService;
import com.amir.mediatracker.service.MediaItemService;
import com.amir.mediatracker.service.UserMediaListService;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
@RequiredArgsConstructor
public class UserQuery  {

    private final MediaItemService mediaItemService;
    private final UserMediaListService userMediaListService;
    private final FollowService followService;

    @QueryMapping
    public List<MediaItemResponse> searchMediaItems(@Argument String query, @Argument Category category, @Argument int page, @Argument int size) {
        return mediaItemService.searchMediaItems(query, category, page, size);
    }

    @QueryMapping
    public List<UserMediaListResponse> myMediaList(@Argument int page, @Argument int size, @AuthenticationPrincipal UserPrincipal user) {
        return userMediaListService.getUserMediaList(user.getId(), page, size);
    }

    @QueryMapping
    public List<UserResponse> myFollowers(@AuthenticationPrincipal UserPrincipal user) {
        return followService.getFollowers(user.getId());
    }

    @QueryMapping
    public List<UserFollowResponse> myFollowing(@AuthenticationPrincipal UserPrincipal user) {
        return followService.getFollowing(user.getId());
    }
}

