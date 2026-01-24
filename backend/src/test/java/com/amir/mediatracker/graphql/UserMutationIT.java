package com.amir.mediatracker.graphql;

import com.amir.mediatracker.config.AbstractIntegrationTest;
import com.amir.mediatracker.dto.response.UserFollowResponse;
import com.amir.mediatracker.dto.response.UserMediaListResponse;
import com.amir.mediatracker.entity.*;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Limit;

import java.util.List;

import static org.assertj.core.api.AssertionsForInterfaceTypes.assertThat;
import static org.junit.jupiter.api.Assertions.*;

public class UserMutationIT extends AbstractIntegrationTest {

    private final String ADD_MEDIA_TO_LIST_JSON_START = "\"addMediaToList\":";
    private final String REMOVE_MEDIA_FROM_LIST_JSON_START = "\"removeMediaFromList\":";
    private final String UPDATE_MEDIA_LIST_ITEM_LIST_JSON_START = "\"updateMediaListItem\":";
    private final String FOLLOW_USER_JSON_START = "\"followUser\":";
    private final String UNFOLLOW_USER_JSON_START = "\"unfollowUser\":";
    private final String UPDATE_FOLLOW_THRESHOLD_JSON_START = "\"updateFollowThreshold\":";

    @Test
    void updateThreshold_success() throws Exception {
        User follow = saveUser("follow");
        UserFollow uf = new UserFollow();
        uf.setFollower(user);
        uf.setFollowing(follow);
        uf.setMinimumRatingThreshold((short) 8);
        userFollowRepository.save(uf);

        String resultJson = graphql("""
            {
              "query": "mutation UpdateFollowThreshold($followUserId: ID!, $threshold: Int!) { updateFollowThreshold(followUserId: $followUserId, threshold: $threshold) { minimumRatingThreshold } }",
              "variables": {
                    "followUserId": %d,
                    "threshold": 10
                  }
            }
            """.formatted(follow.getId())
        );

        UserFollowResponse response =
                mockMvcJsonToObject(
                        resultJson,
                        UPDATE_FOLLOW_THRESHOLD_JSON_START,
                        UserFollowResponse.class
                );

        assertEquals((short) 10, response.getMinimumRatingThreshold());
        uf = userFollowRepository.findByFollowerIdAndFollowingId(user.getId(), follow.getId()).get();
        assertEquals((short) 10, uf.getMinimumRatingThreshold());
    }

    @Test
    void unfollowUser_idempotent_returnTrueWhenNotExist() throws Exception {
        String resultJson = graphql("""
            {
              "query": "mutation UnfollowUser($followUserId: ID!) { unfollowUser(followUserId: $followUserId) }",
              "variables": {
                    "followUserId": 9999
                  }
            }
            """);

        Boolean response =
                mockMvcJsonToObject(
                        resultJson,
                        UNFOLLOW_USER_JSON_START,
                        Boolean.class
                );

        assertTrue(response);
    }

    @Test
    void unfollowUser_success() throws Exception {
        User follow = saveUser("follow");
        UserFollow uf = new UserFollow();
        uf.setFollower(user);
        uf.setFollowing(follow);
        userFollowRepository.save(uf);

        String resultJson = graphql("""
            {
              "query": "mutation UnfollowUser($followUserId: ID!) { unfollowUser(followUserId: $followUserId) }",
              "variables": {
                    "followUserId": %d
                  }
            }
            """.formatted(follow.getId())
        );

        Boolean response =
                mockMvcJsonToObject(
                        resultJson,
                        UNFOLLOW_USER_JSON_START,
                        Boolean.class
                );

        assertTrue(response);
    }

    @Test
    void followUser_cannotFollowYourself() throws Exception {

        String resultJson = graphql("""
            {
              "query": "mutation FollowUser($request: FollowRequest!) { followUser(request: $request) { id minimumRatingThreshold } }",
              "variables": {
                    "request": {
                      "userId": %d,
                      "minimumRatingThreshold": 9
                    }
                  }
            }
            """.formatted(user.getId())
        );

        assertThat(resultJson).contains("cannot follow yourself");
    }

    @Test
    void followUser_duplicate() throws Exception {
        User follow = saveUser("follow");

        String jsonCall = """
            {
              "query": "mutation FollowUser($request: FollowRequest!) { followUser(request: $request) { id minimumRatingThreshold } }",
              "variables": {
                    "request": {
                      "userId": %d,
                      "minimumRatingThreshold": 9
                    }
                  }
            }
            """.formatted(follow.getId());

        graphql(jsonCall); //success
        String resultJson = graphql(jsonCall); //duplicate

        assertThat(resultJson).contains("already following");
    }

    @Test
    void followUser_success() throws Exception {
        User follow = saveUser("follow");

        String resultJson = graphql("""
            {
              "query": "mutation FollowUser($request: FollowRequest!) { followUser(request: $request) { id minimumRatingThreshold } }",
              "variables": {
                    "request": {
                      "userId": %d,
                      "minimumRatingThreshold": 6
                    }
                  }
            }
            """.formatted(follow.getId())
        );

        UserFollowResponse response =
                mockMvcJsonToObject(
                        resultJson,
                        FOLLOW_USER_JSON_START,
                        UserFollowResponse.class
                );

        assertEquals((short) 6, response.getMinimumRatingThreshold());

        assertTrue(userFollowRepository.existsByFollowerIdAndFollowingId(user.getId(), follow.getId()));
    }

    @Test
    void updateMediaList_SuccessfulKafkaFlow() throws Exception {
        MediaItem mediaItem = saveBasicMediaItem("SomeItem");
        UserMediaList uml = userMediaListRepository.save(UserMediaList.builder()
                .user(user)
                .mediaItem(mediaItem)
                .build());

        User follower = userRepository.save(saveUser("follower"));
        UserFollow uf = new UserFollow();
        uf.setFollower(follower);
        uf.setFollowing(user);
        uf.setMinimumRatingThreshold((short) 9);
        userFollowRepository.save(uf);


        String resultJson = graphql("""
            {
              "query": "mutation UpdateMediaListItem($request: UpdateMediaListRequest!) { updateMediaListItem(request: $request) { id } }",
              "variables": {
                    "request": {
                      "id": %d,
                      "experienced": true,
                      "wishToReexperience": true,
                      "rating": 10,
                      "comment": "someComment"
                    }
                  }
            }
            """.formatted(uml.getId())
        );

        UserMediaListResponse response =
                mockMvcJsonToObject(
                        resultJson,
                        UPDATE_MEDIA_LIST_ITEM_LIST_JSON_START,
                        UserMediaListResponse.class
                );

        assertNotNull(response.getId());

        waitForKafkaConsumer();

        List<Notification> notifications = notificationRepository
                .findByUserIdOrderByCreatedAtDesc(follower.getId(), Limit.of(1));

        assertFalse(notifications.isEmpty());
        assertEquals(mediaItem.getId(), notifications.getFirst().getMediaItem().getId());
        assertEquals(user.getId(), notifications.getFirst().getRatedByUser().getId());
        assertThat(notifications.getFirst().getMessage()).contains("10");
    }

    @Test
    void removeMediaFromList_notFound() throws Exception {

        String resultJson = graphql("""
            {
              "query": "mutation RemoveMediaFromList($id: ID!) { removeMediaFromList(id: $id) }",
              "variables": {
                "id": 100
              }
            }
            """
        );

        assertTrue(resultJson.contains("NOT_FOUND"));
        assertTrue(resultJson.contains("Media list item not found"));
    }

    @Test
    void removeMediaFromList_success() throws Exception {
        MediaItem mediaItem = saveBasicMediaItem("SomeItem");
        UserMediaList uml = userMediaListRepository.save(UserMediaList.builder()
                        .user(user)
                        .mediaItem(mediaItem)
                .build());


        String resultJson = graphql("""
            {
              "query": "mutation RemoveMediaFromList($id: ID!) { removeMediaFromList(id: $id) }",
              "variables": {
                "id": %d
              }
            }
            """.formatted(uml.getId())
        );

        Boolean response =
                mockMvcJsonToObject(
                        resultJson,
                        REMOVE_MEDIA_FROM_LIST_JSON_START,
                        Boolean.class
                );

        assertTrue(response);
        assertFalse(userMediaListRepository.existsById(uml.getId()));
    }

    @Test
    void addMediaToList_duplicate() throws Exception {
        MediaItem mediaItem = saveBasicMediaItem("SomeItem");

        String callString = """
            {
              "query": "mutation AddMediaToList($mediaItemId: ID!) { addMediaToList(mediaItemId: $mediaItemId) { id mediaItem { name } experienced } }",
              "variables": {
                "mediaItemId": %d
              }
            }
            """.formatted(mediaItem.getId());

        // first call
        graphql(callString);

        // second call
        String resultJson = graphql(callString);

        assertTrue(resultJson.contains("BAD_REQUEST"));
        assertTrue(resultJson.contains("already in user list"));
    }

    @Test
    void addMediaToList_mediaNotFound() throws Exception {

        String resultJson = graphql("""
                {
                  "query": "mutation AddMediaToList($mediaItemId: ID!) { addMediaToList(mediaItemId: $mediaItemId) { id mediaItem { name } experienced } }",
                  "variables": {
                    "mediaItemId": %d
                  }
                }
                """.formatted(99)
        );

        assertTrue(resultJson.contains("NOT_FOUND"));
        assertTrue(resultJson.contains("Media item not found"));
    }

    @Test
    void addMediaToList_success() throws Exception {

        MediaItem mediaItem = saveBasicMediaItem("SomeItem");

        String resultJson = graphql("""
                {
                  "query": "mutation AddMediaToList($mediaItemId: ID!) { addMediaToList(mediaItemId: $mediaItemId) { id mediaItem { name } experienced } }",
                  "variables": {
                    "mediaItemId": %d
                  }
                }
                """.formatted(mediaItem.getId())
                );

        UserMediaListResponse response =
                mockMvcJsonToObject(
                        resultJson,
                        ADD_MEDIA_TO_LIST_JSON_START,
                        UserMediaListResponse.class
                );

        assertEquals(mediaItem.getName(), response.getMediaItem().getName());

        UserMediaList uml = userMediaListRepository.findById(response.getId()).orElseThrow();
        assertEquals(mediaItem.getId(), uml.getMediaItem().getId());
        assertFalse(response.getExperienced());
    }
}
