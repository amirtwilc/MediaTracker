package com.amir.mediatracker.graphql;

import com.amir.mediatracker.aop.LogAround;
import com.amir.mediatracker.dto.response.*;
import com.amir.mediatracker.entity.Genre;
import com.amir.mediatracker.entity.Platform;
import com.amir.mediatracker.graphql.dto.input.*;
import com.amir.mediatracker.graphql.dto.result.MediaPageResult;
import com.amir.mediatracker.graphql.dto.result.UserMediaListPageResult;
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
import java.util.stream.Collectors;

@LogAround
@Controller
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
@RequiredArgsConstructor
public class UserQuery  {

    private final MediaItemService mediaItemService;
    private final UserMediaListService userMediaListService;
    private final FollowService followService;

    /**
     * Search media items with cursor pagination. Cursor is (name, id)
     * Category filtering is OR (for example: MOVIES or SERIES)
     * Genre and Platform filtering is AND (for example: Action and Drama)
     * @param input Defines search properties
     * @param userPrincipal The user principal
     * @return Cursor based media items search results, along with inUserList property for each item, signaling if the item is in the user's list
     */
    @QueryMapping
    public MediaSearchResponse searchMediaItems(
            @Argument SearchMediaInput input,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        return mediaItemService.searchMediaItemsCursor(
                userPrincipal.getId(),
                input.getQuery(),
                input.getCategories(),
                input.getGenreIds(),
                input.getPlatformIds(),
                input.getCursorName(),
                input.getCursorId(),
                input.getLimitOrDefault()
        );
    }

    /**
     * Search media items, with sorting option: by YEAR, AVG_RATING, NAME
     * Default sorting is by NAME ASC
     * Supports paging
     * @param input SearchMediaSortedInput
     * @param userPrincipal The user principal
     * @return MediaPageResult
     */
    @QueryMapping
    public MediaPageResult searchMediaItemsSorted(
            @Argument SearchMediaSortedInput input,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        var page = mediaItemService.searchMediaItemsSorted(
                userPrincipal.getId(),
                input.getQuery(),
                input.getCategories(),
                input.getGenreIds(),
                input.getPlatformIds(),
                input.getPageOrDefault(),
                input.getSizeOrDefault(),
                input.getSortyByOrDefault(),
                input.getSortyDirectionOrDefault()
        );

        return MediaPageResult.builder()
                .content(page.getContent())
                .totalPages(page.getTotalPages())
                .totalElements(page.getTotalElements())
                .number(page.getNumber())
                .size(page.getSize())
                .build();
    }

    /**
     * Returns entire list of a user with cursor pagination. Cursor is (name, id)
     * If a user is not specified via displayUserId field, the calling user's list would return.
     * If the user specified under displayUserId is not the calling user, a check for user visibility is performed
     * @param input UserMediaListInput
     * @param userPrincipal UserPrincipal
     * @return UserMediaListSearchResponse
     */
    @QueryMapping
    public UserMediaListSearchResponse userMediaListCursor(
            @Argument UserMediaListInput input,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        return userMediaListService.getUserMediaListCursor(
                input.getDisplayUserId(),
                userPrincipal.getId(),
                input.getSearchQuery(),
                input.getCategories(),
                input.getGenreIds(),
                input.getPlatformIds(),
                input.getWishToExperience(),
                input.getCursorName(),
                input.getCursorId(),
                input.getLimitOrDefault()
        );
    }

    /**
     * Retrieves user list, with sorting option: by NAME, YEAR, EXPERIENCED, REEXPERIENCE, RATING
     * Default sorting is by NAME ASC
     * Supports paging
     * If a user is not specified via displayUserId field, the calling user's list would return.
     * If the user specified under displayUserId is not the calling user, a check for user visibility is performed
     * @param input UserMediaListSortedInput
     * @param userPrincipal UserPrincipal
     * @return UserMediaListPageResult
     */
    @QueryMapping
    public UserMediaListPageResult userMediaListSorted(
            @Argument UserMediaListSortedInput input,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        var page = userMediaListService.getUserMediaListSorted(
                input.getDisplayUserId(),
                userPrincipal.getId(),
                input.getSearchQuery(),
                input.getCategories(),
                input.getGenreIds(),
                input.getPlatformIds(),
                input.getWishToExperience(),
                input.getPageOrDefault(),
                input.getSizeOrDefault(),
                input.getSortByOrDefault(),
                input.getSortDirectionOrDefault()
        );

        return UserMediaListPageResult.builder()
                .content(page.getContent())
                .totalPages(page.getTotalPages())
                .totalElements(page.getTotalElements())
                .number(page.getNumber())
                .size(page.getSize())
                .build();
    }

    /**
     * Retrieve all users who follow the calling user.
     * Invisible users are still shown here
     * @param user UserPrincipal
     * @return List of UserResponse
     */
    @QueryMapping
    public List<UserResponse> myFollowers(@AuthenticationPrincipal UserPrincipal user) {
        return followService.getFollowers(user.getId());
    }

    /**
     * Returns all users who are followed by calling user
     * @param user UserPrincipal
     * @return List of UserResponse
     */
    @QueryMapping
    public List<UserFollowResponse> myFollowing(@AuthenticationPrincipal UserPrincipal user) {
        return followService.getFollowing(user.getId());
    }


    @QueryMapping
    public List<GenreResponse> myListGenres(
            @Argument MyListFiltersInput input,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        return userMediaListService.getUserGenres(
                userPrincipal.getId(),
                input.getSearchQuery(),
                input.getCategories()
        );
    }

    @QueryMapping
    public List<PlatformResponse> myListPlatforms(
            @Argument MyListFiltersInput input,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        return userMediaListService.getUserPlatforms(
                userPrincipal.getId(),
                input.getSearchQuery(),
                input.getCategories()
        );
    }

    @QueryMapping
    public List<GenreResponse> availableMediaGenres(
            @Argument AvailableFiltersInput input) {

        List<Genre> genres = mediaItemService.getAvailableGenres(
                input.getQuery() != null ? input.getQuery() : "",
                input.getCategories()
        );

        return genres.stream()
                .map(g -> GenreResponse.builder()
                        .id(g.getId())
                        .name(g.getName())
                        .build())
                .collect(Collectors.toList());
    }

    @QueryMapping
    public List<PlatformResponse> availableMediaPlatforms(
            @Argument AvailableFiltersInput input) {

        List<Platform> platforms = mediaItemService.getAvailablePlatforms(
                input.getQuery() != null ? input.getQuery() : "",
                input.getCategories()
        );

        return platforms.stream()
                .map(p -> PlatformResponse.builder()
                        .id(p.getId())
                        .name(p.getName())
                        .build())
                .collect(Collectors.toList());
    }
}

