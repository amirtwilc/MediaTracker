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
                input.getLimit() != null ? input.getLimit() : 20
        );
    }

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
                input.getPage() != null ? input.getPage() : 0,
                input.getSize() != null ? input.getSize() : 20,
                input.getSortBy() != null ? input.getSortBy() : "name",
                input.getSortDirection() != null ? input.getSortDirection() : "ASC"
        );

        return MediaPageResult.builder()
                .content(page.getContent())
                .totalPages(page.getTotalPages())
                .totalElements(page.getTotalElements())
                .number(page.getNumber())
                .size(page.getSize())
                .build();
    }

    @QueryMapping
    public UserMediaListSearchResponse myMediaListCursor(
            @Argument MyMediaListInput input,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        return userMediaListService.getUserMediaListCursor(
                userPrincipal.getId(),
                input.getSearchQuery(),
                input.getCategories(),
                input.getGenreIds(),
                input.getPlatformIds(),
                input.getWishToExperience(),
                input.getCursorName(),
                input.getCursorId(),
                input.getLimit() != null ? input.getLimit() : 20
        );
    }

    @QueryMapping
    public UserMediaListPageResult myMediaListSorted(
            @Argument MyMediaListSortedInput input,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        var page = userMediaListService.getUserMediaListSorted(
                userPrincipal.getId(),
                input.getSearchQuery(),
                input.getCategories(),
                input.getGenreIds(),
                input.getPlatformIds(),
                input.getWishToExperience(),
                input.getPage() != null ? input.getPage() : 0,
                input.getSize() != null ? input.getSize() : 20,
                input.getSortBy() != null ? input.getSortBy() : "name",
                input.getSortDirection() != null ? input.getSortDirection() : "ASC"
        );

        return UserMediaListPageResult.builder()
                .content(page.getContent())
                .totalPages(page.getTotalPages())
                .totalElements(page.getTotalElements())
                .number(page.getNumber())
                .size(page.getSize())
                .build();
    }

    @QueryMapping
    public List<UserResponse> myFollowers(@AuthenticationPrincipal UserPrincipal user) {
        return followService.getFollowers(user.getId());
    }

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

