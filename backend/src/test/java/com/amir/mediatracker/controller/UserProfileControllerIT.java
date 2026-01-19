package com.amir.mediatracker.controller;

import com.amir.mediatracker.config.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class UserProfileControllerIT extends AbstractIntegrationTest {

    @Test
    void basicSearch_endpointWorks() throws Exception {
        mockMvc.perform(get("/users/search/basic")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[*].id").isNotEmpty());
    }

    @Test
    void advancedSearch_endpointWorks() throws Exception {
        mockMvc.perform(post("/users/search/advanced")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
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
}
