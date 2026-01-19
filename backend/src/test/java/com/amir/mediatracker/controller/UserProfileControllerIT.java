package com.amir.mediatracker.controller;

import com.amir.mediatracker.config.AbstractIntegrationTest;
import com.amir.mediatracker.dto.Category;
import com.amir.mediatracker.dto.Role;
import com.amir.mediatracker.entity.MediaItem;
import com.amir.mediatracker.entity.User;
import com.amir.mediatracker.entity.UserFollow;
import com.amir.mediatracker.entity.UserMediaList;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class UserProfileControllerIT extends AbstractIntegrationTest {

    @Test
    void updateSettings_getSettings_shouldReturnUserSettingsAndThenUpdateSettings() throws Exception {
        User currentUser = userRepository.findById(user.getId()).get();
        currentUser.setIsInvisible(true);
        currentUser.setShowEmail(false);
        userRepository.save(currentUser);

        mockMvc.perform(get("/users/me/settings")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isInvisible").value(true))
                .andExpect(jsonPath("$.showEmail").value(false));

        String body = """
            {
              "isInvisible": false,
              "showEmail": true
            }
            """;

        mockMvc.perform(put("/users/me/settings")
                        .contentType(APPLICATION_JSON)
                        .content(body)
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isInvisible").value(false))
                .andExpect(jsonPath("$.showEmail").value(true));

        currentUser = userRepository.findById(user.getId()).get();
        assertFalse(currentUser.getIsInvisible());
        assertTrue(currentUser.getShowEmail());
    }

    @Test
    void getUserProfile_shouldReturnProfile() throws Exception {
        User profileUser = userRepository.save(createUser("john"));

        userFollowRepository.save(
                new UserFollow(null, user, profileUser, null, null));

        mockMvc.perform(get("/users/{id}/profile", profileUser.getId())
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("john"))
                .andExpect(jsonPath("$.isFollowing").value(true));
    }

    @Test
    void getUserProfile_shouldReturn404_whenNotExist() throws Exception {

        mockMvc.perform(get("/users/{id}/profile", 100L)
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void getUserProfile_shouldReturn404_whenInvisible() throws Exception {
        User hiddenUser = createUser("hidden");
        hiddenUser.setIsInvisible(true);
        userRepository.save(hiddenUser);

        mockMvc.perform(get("/users/{id}/profile", hiddenUser.getId())
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void basicSearch_endpointWorks() throws Exception {
        mockMvc.perform(get("/users/search/basic")
                        .header("Authorization", "Bearer " + userToken)
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[*].id").isNotEmpty());
    }

    @Test
    void advancedSearch_endpointWorks() throws Exception {
        mockMvc.perform(post("/users/search/advanced")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(APPLICATION_JSON)
                        .content("""
                            {
                              "itemRatingCriteria": [
                                { "mediaItemId": 1, "minRating": 8, "maxRating": 10 }
                              ],
                              "page": 0,
                              "size": 10
                            }
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    private User createUser(String username) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(username + "@example.com");
        user.setPasswordHash("password");
        user.setRole(Role.USER);
        user.setLastActive(LocalDateTime.now());
        return user;
    }
}
