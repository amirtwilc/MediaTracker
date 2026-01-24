package com.amir.mediatracker.graphql;

import com.amir.mediatracker.aop.LogAround;
import com.amir.mediatracker.dto.request.FollowRequest;
import com.amir.mediatracker.dto.request.UpdateMediaListRequest;
import com.amir.mediatracker.dto.response.UserFollowResponse;
import com.amir.mediatracker.dto.response.UserMediaListResponse;
import com.amir.mediatracker.kafka.RatingProducer;
import com.amir.mediatracker.security.dto.UserPrincipal;
import com.amir.mediatracker.service.FollowService;
import com.amir.mediatracker.service.UserMediaListService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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
    private final RatingProducer ratingProducer;

    /**
     * Add a new media item to user list
     * @param mediaItemId Id of the added media item
     * @param user UserPrincipal
     * @return UserMediaListResponse
     */
    @MutationMapping
    public UserMediaListResponse addMediaToList(@Argument Long mediaItemId, @AuthenticationPrincipal UserPrincipal user) {
        return userMediaListService.addMediaToList(user.getId(), mediaItemId);
    }

    /**
     * Update a media list item.
     * May update experience flag, reexperience flag, rating, comment.
     * Passing a null value does not remove the current value.
     * Rating and Reexperience flag may only be updated if experience flag is checked.
     * Rating an item initiates an event to send a notification to followers.
     * @param request UpdateMediaListRequest
     * @param user UserPrincipal
     * @return UserMediaListResponse
     */
    @MutationMapping
    public UserMediaListResponse updateMediaListItem(@Argument UpdateMediaListRequest request,
                                                     @AuthenticationPrincipal UserPrincipal user) {
        return userMediaListService.updateMediaListItem(user.getId(), request);
    }

    /**
     * Remove a media item from user list
     * @param id Id of the userMediaList entity
     * @param user UserPrincipal
     * @return Whether the remove was successful
     */
    @MutationMapping
    public Boolean removeMediaFromList(@Argument Long id, @AuthenticationPrincipal UserPrincipal user) {
        userMediaListService.removeMediaFromList(user.getId(), id);
        return true;
    }

    /**
     * Assign the calling user to follow the requested user.
     * minimumRatingThreshold is defined to let the system know on which ratings should be notified
     * @param request FollowRequest
     * @param user UserPrincipal
     * @return UserFollowResponse
     */
    @MutationMapping
    public UserFollowResponse followUser(@Argument FollowRequest request, @AuthenticationPrincipal UserPrincipal user) {
        return followService.followUser(user.getId(), request);
    }

    /**
     * Remove a user from calling user's follow list
     * @param followUserId the user id to unfollow
     * @param user UserPrincipal
     * @return Whether the removal was successful
     */
    @MutationMapping
    public Boolean unfollowUser(@Argument Long followUserId, @AuthenticationPrincipal UserPrincipal user) {
        followService.unfollowUser(followUserId, user.getId());
        return true;
    }

    /**
     * Update rating threshold for receiving notifications upon ratings
     * @param followUserId The user being followed
     * @param threshold The new threshold value
     * @param user UserPrincipal
     * @return UserFollowResponse
     */
    @MutationMapping
    public UserFollowResponse updateFollowThreshold(@Argument Long followUserId,
                                                    @Argument @Min(0) @Max(10) Short threshold,
                                                    @AuthenticationPrincipal UserPrincipal user) {
        return followService.updateThreshold(user.getId(), followUserId, threshold);
    }
}

