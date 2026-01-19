package com.amir.mediatracker.repository;

import com.amir.mediatracker.config.AbstractIntegrationTest;
import com.amir.mediatracker.dto.Category;
import com.amir.mediatracker.dto.ItemRatingCriteria;
import com.amir.mediatracker.dto.Role;
import com.amir.mediatracker.dto.UserSortBy;
import com.amir.mediatracker.dto.response.UserProfileResponse;
import com.amir.mediatracker.entity.*;
import com.amir.mediatracker.exception.BadRequestException;
import org.hibernate.query.SortDirection;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.AssertionsForInterfaceTypes.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

public class UserSearchRepositoryImplIT extends AbstractIntegrationTest {

    private User mostFollowers;
    private User mostRatings;
    private User lastRegistered;
    private User lastActive;
    private MediaItem matrix;
    private MediaItem gladiator;

    @BeforeEach
    void setUp() {
        //There are 2 more users with no items from AbstractIntegrationTest
        mostFollowers = insertUser("mostFollowers", Role.ADMIN);
        mostRatings = insertUser("mostRatings", Role.USER);
        lastActive = insertUser("lastActive", Role.ADMIN);
        lastRegistered = insertUser("lastRegistered", Role.USER);

        updateUserLastActive(lastActive);

        Genre action = insertGenre("Action");
        Platform netflix = insertPlatform("Netflix");
        matrix = insertMedia("The Matrix", Set.of(action), Set.of(netflix));
        gladiator = insertMedia("Gladiator", Set.of(action), Set.of(netflix));

        //ratings summary: mostRatings=2, mostFollowers=1, lastActive=1, lastRegistered(and 2 more)=0
        rate(mostRatings, matrix, (short) 9);
        rate(mostRatings, gladiator, (short) 7);

        rate(mostFollowers, matrix, (short) 9);
        rate(lastActive, matrix, (short) 6);

        //follows summary: mostFollowers=2, mostRatings=1, lastRegistered=1, lastActive(and 2 more)=0
        follow(mostRatings, mostFollowers);
        follow(lastActive, mostFollowers);

        follow(mostFollowers, mostRatings);
        follow(lastActive, lastRegistered);
    }

    @Test
    public void advancedSearch_search0Items() {
        List<ItemRatingCriteria> criteria = List.of();

        assertThrows(BadRequestException.class, () -> userSearchRepository.advancedSearch(
                lastActive.getId(),
                criteria,
                UserSortBy.RATINGS,
                SortDirection.DESCENDING,
                PageRequest.of(0, 10)
        ));
    }

    @Test
    public void advancedSearch_search1Item_butShouldNotShowHimself() {
        List<ItemRatingCriteria> criteria = List.of(
                new ItemRatingCriteria(matrix.getId(), 1, 10)
        );

        Page<UserProfileResponse> result =
                userSearchRepository.advancedSearch(
                        lastActive.getId(),
                        criteria,
                        UserSortBy.RATINGS,
                        SortDirection.DESCENDING,
                        PageRequest.of(0, 10)
                );

        assertThat(result.getContent())
                .hasSize(2)
                .extracting(UserProfileResponse::getId)
                .doesNotContain(lastActive.getId())
                .first()
                .isEqualTo(mostRatings.getId());
    }

    @Test
    public void advancedSearch_search2Items_withNotCorrectRange() {
        List<ItemRatingCriteria> criteria = List.of(
                new ItemRatingCriteria(matrix.getId(), 8, 10),
                new ItemRatingCriteria(gladiator.getId(), 1, 6) //should be 7
        );

        Page<UserProfileResponse> result =
                userSearchRepository.advancedSearch(
                        lastActive.getId(),
                        criteria,
                        UserSortBy.RATINGS,
                        SortDirection.DESCENDING,
                        PageRequest.of(0, 10)
                );

        assertThat(result.getContent())
                .hasSize(0);
    }

    @Test
    public void advancedSearch_search2Items_withCorrectRange() {
        List<ItemRatingCriteria> criteria = List.of(
                new ItemRatingCriteria(matrix.getId(), 8, 10),
                new ItemRatingCriteria(gladiator.getId(), 6, 8)
        );

        Page<UserProfileResponse> result =
                userSearchRepository.advancedSearch(
                        lastActive.getId(),
                        criteria,
                        UserSortBy.RATINGS,
                        SortDirection.DESCENDING,
                        PageRequest.of(0, 10)
                );

        assertThat(result.getContent())
                .hasSize(1)
                .first()
                .extracting(UserProfileResponse::getId)
                .isEqualTo(mostRatings.getId());
    }

    @Test
    public void advancedSearch_search2Items_withExactRating() {
        List<ItemRatingCriteria> criteria = List.of(
                new ItemRatingCriteria(matrix.getId(), 9, 9),
                new ItemRatingCriteria(gladiator.getId(), 7, 7)
        );

        Page<UserProfileResponse> result =
                userSearchRepository.advancedSearch(
                        lastActive.getId(),
                        criteria,
                        UserSortBy.RATINGS,
                        SortDirection.DESCENDING,
                        PageRequest.of(0, 10)
                );

        assertThat(result.getContent())
                .hasSize(1)
                .first()
                .extracting(UserProfileResponse::getId)
                .isEqualTo(mostRatings.getId());
    }

    @Test
    public void basicSearch_fetchByPartialName_butShouldNotShowHimself() {
        Page<UserProfileResponse> result =
                userSearchRepository.basicSearch(
                        mostRatings.getId(),
                        "ost",
                        false,
                        UserSortBy.REGISTRATION_DATE,
                        SortDirection.DESCENDING,
                        PageRequest.of(0, 5)
                );

        assertEquals(1, result.getTotalElements());
        assertEquals(1, result.getTotalPages());

        assertThat(result.getContent())
                .hasSize(1)
                .extracting(UserProfileResponse::getId)
                .doesNotContain(lastActive.getId())
                .first().isEqualTo(mostFollowers.getId());
    }

    @Test
    public void basicSearch_fetchByExactName_butAskedForOnlyAdmins() {
        Page<UserProfileResponse> result =
                userSearchRepository.basicSearch(
                        mostRatings.getId(),
                        "lastRegistered",
                        true,
                        UserSortBy.FOLLOWERS,
                        SortDirection.DESCENDING,
                        PageRequest.of(0, 5)
                );

        assertEquals(0, result.getTotalElements());
        assertEquals(0, result.getTotalPages());

        assertThat(result.getContent())
                .hasSize(0);
    }

    @Test
    public void basicSearch_fetchByExactName() {
        Page<UserProfileResponse> result =
                userSearchRepository.basicSearch(
                        mostRatings.getId(),
                        "lastRegistered",
                        false,
                        UserSortBy.FOLLOWERS,
                        SortDirection.DESCENDING,
                        PageRequest.of(0, 5)
                );

        assertEquals(1, result.getTotalElements());
        assertEquals(1, result.getTotalPages());

        assertThat(result.getContent())
                .hasSize(1)
                .extracting(UserProfileResponse::getId)
                .doesNotContain(lastActive.getId())
                .first().isEqualTo(lastRegistered.getId());
    }

    @Test
    public void basicSearch_fetchAll_onlyAdmins() {
        Page<UserProfileResponse> result =
                userSearchRepository.basicSearch(
                        mostRatings.getId(),
                        null,
                        true,
                        UserSortBy.FOLLOWERS,
                        SortDirection.DESCENDING,
                        PageRequest.of(0, 5)
                );

        assertEquals(3, result.getTotalElements());
        assertEquals(1, result.getTotalPages());

        assertThat(result.getContent())
                .hasSize(3)
                .extracting(UserProfileResponse::getId)
                .doesNotContain(mostRatings.getId())
                .first().isEqualTo(mostFollowers.getId());
    }

    @Test
    public void basicSearch_fetchAll_sortByFollowersAsc() {
        Page<UserProfileResponse> result =
                userSearchRepository.basicSearch(
                        lastActive.getId(),
                        null,
                        false,
                        UserSortBy.FOLLOWERS,
                        SortDirection.ASCENDING,
                        PageRequest.of(4, 1)
                );

        assertEquals(5, result.getTotalElements());
        assertEquals(5, result.getTotalPages());

        assertThat(result.getContent())
                .hasSize(1)
                .extracting(UserProfileResponse::getId)
                .doesNotContain(lastActive.getId())
                .last().isEqualTo(mostFollowers.getId());

        assertThat(result.getContent())
                .extracting(UserProfileResponse::getIsFollowing)
                .first().isEqualTo(true);
    }

    @Test
    public void basicSearch_fetchAll_sortByFollowersDesc() {
        Page<UserProfileResponse> result =
                userSearchRepository.basicSearch(
                        mostRatings.getId(),
                        null,
                        false,
                        UserSortBy.FOLLOWERS,
                        SortDirection.DESCENDING,
                        PageRequest.of(0, 1)
                );

        assertEquals(5, result.getTotalElements());
        assertEquals(5, result.getTotalPages());

        assertThat(result.getContent())
                .hasSize(1)
                .extracting(UserProfileResponse::getId)
                .doesNotContain(mostRatings.getId())
                .first().isEqualTo(mostFollowers.getId());

        assertThat(result.getContent())
                .extracting(UserProfileResponse::getIsFollowing)
                .first().isEqualTo(true);
    }

    @Test
    public void basicSearch_fetchAll_sortByRatingsAsc() {
        Page<UserProfileResponse> result =
                userSearchRepository.basicSearch(
                        lastActive.getId(),
                        null,
                        false,
                        UserSortBy.RATINGS,
                        SortDirection.ASCENDING,
                        PageRequest.of(0, 3)
                );

        assertEquals(5, result.getTotalElements());
        assertEquals(2, result.getTotalPages());

        assertThat(result.getContent())
                .hasSize(3)
                .extracting(UserProfileResponse::getId)
                .doesNotContain(lastActive.getId())
                .doesNotContain(mostRatings.getId()); //In next page

        assertThat(result.getContent())
                .extracting(UserProfileResponse::getRatingsCount)
                .allMatch(count -> count == 0L); //all 3 in this page have 0 ratings
    }

    @Test
    public void basicSearch_fetchAll_sortByRatingsDesc() {
        Page<UserProfileResponse> result =
                userSearchRepository.basicSearch(
                        lastRegistered.getId(),
                        null,
                        false,
                        UserSortBy.RATINGS,
                        SortDirection.DESCENDING,
                        PageRequest.of(0, 3)
                );

        assertEquals(5, result.getTotalElements());
        assertEquals(2, result.getTotalPages());

        assertThat(result.getContent())
                .hasSize(3)
                .extracting(UserProfileResponse::getId)
                .doesNotContain(lastRegistered.getId())
                .first().isEqualTo(mostRatings.getId());

        assertThat(result.getContent())
                .extracting(UserProfileResponse::getIsFollowing)
                .first().isEqualTo(false);
    }

    @Test
    public void basicSearch_fetchAll_sortByRegistrationDateAsc() {
        Page<UserProfileResponse> result =
                userSearchRepository.basicSearch(
                        lastActive.getId(),
                        null,
                        false,
                        UserSortBy.REGISTRATION_DATE,
                        SortDirection.ASCENDING,
                        PageRequest.of(1, 4)
                );

        assertEquals(5, result.getTotalElements());
        assertEquals(2, result.getTotalPages());

        assertThat(result.getContent())
                .hasSize(1)
                .extracting(UserProfileResponse::getId)
                .doesNotContain(lastActive.getId())
                .first().isEqualTo(lastRegistered.getId()); //only one in page 1

        assertThat(result.getContent())
                .extracting(UserProfileResponse::getIsFollowing)
                .first().isEqualTo(true);
    }

    @Test
    public void basicSearch_fetchAll_sortByRegistrationDateDesc() {
        Page<UserProfileResponse> result =
                userSearchRepository.basicSearch(
                        lastActive.getId(),
                        null,
                        false,
                        UserSortBy.REGISTRATION_DATE,
                        SortDirection.DESCENDING,
                        PageRequest.of(0, 4)
                );

        assertEquals(5, result.getTotalElements());
        assertEquals(2, result.getTotalPages());

        assertThat(result.getContent())
                .hasSize(4)
                .extracting(UserProfileResponse::getId)
                .doesNotContain(lastActive.getId())
                .first().isEqualTo(lastRegistered.getId());

        assertThat(result.getContent())
                .extracting(UserProfileResponse::getIsFollowing)
                .first().isEqualTo(true);
    }

    @Test
    public void basicSearch_fetchAll_sortByLastActiveAsc() {
        Page<UserProfileResponse> result =
                userSearchRepository.basicSearch(
                        mostRatings.getId(),
                        null,
                        false,
                        UserSortBy.LAST_ACTIVE,
                        SortDirection.ASCENDING,
                        PageRequest.of(0, 5)
                );

        assertEquals(5, result.getTotalElements());
        assertEquals(1, result.getTotalPages());

        assertThat(result.getContent())
                .hasSize(5)
                .extracting(UserProfileResponse::getId)
                .doesNotContain(mostRatings.getId())
                .element(2).isEqualTo(lastActive.getId()); //elements 3 and 4 have lastActive=null)

        assertThat(result.getContent())
                .extracting(UserProfileResponse::getIsFollowing)
                .element(2).isEqualTo(false);
    }

    @Test
    public void basicSearch_fetchAll_sortByLastActiveDesc() {
        Page<UserProfileResponse> result =
                userSearchRepository.basicSearch(
                        lastRegistered.getId(),
                        null,
                        false,
                        UserSortBy.LAST_ACTIVE,
                        SortDirection.DESCENDING,
                        PageRequest.of(0, 6)
                );

        assertEquals(5, result.getTotalElements());
        assertEquals(1, result.getTotalPages());

        assertThat(result.getContent())
                .hasSize(5)
                .extracting(UserProfileResponse::getId)
                .doesNotContain(lastRegistered.getId())
                .first().isEqualTo(lastActive.getId());

        assertThat(result.getContent())
                .extracting(UserProfileResponse::getIsFollowing)
                .first().isEqualTo(false);
    }

    private User insertUser(String username, Role role) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(username + "@example.com");
        user.setPasswordHash("password");
        user.setRole(role);
        user.setLastActive(LocalDateTime.now());
        return userRepository.save(user);
    }

    private void updateUserLastActive(User user) {
        user.setLastActive(LocalDateTime.now());
        userRepository.save(user);
    }

    private MediaItem insertMedia(String name, Set<Genre> genres, Set<Platform> platforms) {
        MediaItem item = new MediaItem();
        item.setCategory(Category.MOVIE);
        item.setName(name);
        item.setYear(2000);
        item.setGenres(genres);
        item.setPlatforms(platforms);
        return mediaItemRepository.save(item);
    }

    private Genre insertGenre(String name) {
        Genre genre = new Genre();
        genre.setName(name);
        return genreRepository.save(genre);
    }

    private Platform insertPlatform(String name) {
        Platform platform = new Platform();
        platform.setName(name);
        return platformRepository.save(platform);
    }

    private void rate(User user, MediaItem mediaItem, short rating) {
        UserMediaList uml = new UserMediaList();
        uml.setUser(user);
        uml.setMediaItem(mediaItem);
        uml.setRating(rating);
        userMediaListRepository.save(uml);
    }

    private void follow(User follower, User following) {
        UserFollow uf = new UserFollow();
        uf.setFollower(follower);
        uf.setFollowing(following);
        userFollowRepository.save(uf);
    }
}
