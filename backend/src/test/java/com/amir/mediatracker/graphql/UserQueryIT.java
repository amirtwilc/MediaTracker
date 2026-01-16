package com.amir.mediatracker.graphql;

import com.amir.mediatracker.config.AbstractIntegrationTest;
import com.amir.mediatracker.dto.Category;
import com.amir.mediatracker.entity.Genre;
import com.amir.mediatracker.entity.MediaItem;
import com.amir.mediatracker.entity.Platform;
import com.amir.mediatracker.entity.UserMediaList;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class UserQueryIT extends AbstractIntegrationTest {

    @Test
    void searchMediaItems_shouldReturnResultsWithCursor_becauseMaxLimitReached() throws Exception {
        Genre action = genreRepository.save(new Genre(null, "Action", null));
        Platform netflix = platformRepository.save(new Platform(null, "Netflix", null));

        MediaItem item1 = mediaItemRepository.save(MediaItem.builder()
                .name("Matrix")
                .category(Category.MOVIE)
                .genres(Set.of(action))
                .platforms(Set.of(netflix))
                .build());

        MediaItem item2 = mediaItemRepository.save(MediaItem.builder()
                .name("Matrix Reloaded")
                .category(Category.MOVIE)
                .genres(Set.of(action))
                .platforms(Set.of(netflix))
                .build());

        MediaItem item3 = mediaItemRepository.save(MediaItem.builder()
                .name("Matrix Revolution")
                .category(Category.MOVIE)
                .genres(Set.of(action))
                .platforms(Set.of(netflix))
                .build());

        String payload = """
                {
                  "query": "query Search($input: SearchMediaInput!) { searchMediaItems(input: $input) { items { name } hasMore  totalCount } }",
                  "variables": {
                    "input": {
                      "query": "Matrix",
                      "limit": 3
                    }
                  }
                }
                """; //requested 3, but max limit is 2

        mockMvc.perform(post("/graphql")
                        .contentType("application/json")
                        .content(payload)
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.searchMediaItems.items.length()").value(2))
                .andExpect(jsonPath("$.data.searchMediaItems.hasMore").value(true))
                .andExpect(jsonPath("$.data.searchMediaItems.totalCount").value(3));
    }

    @Test
    void searchMediaItems_shouldReturnResultsWithCursor() throws Exception {
        Genre action = genreRepository.save(new Genre(null, "Action", null));
        Platform netflix = platformRepository.save(new Platform(null, "Netflix", null));

        MediaItem item1 = mediaItemRepository.save(MediaItem.builder()
                .name("Matrix")
                .category(Category.MOVIE)
                .genres(Set.of(action))
                .platforms(Set.of(netflix))
                .build());

        MediaItem item2 = mediaItemRepository.save(MediaItem.builder()
                .name("Matrix Reloaded")
                .category(Category.MOVIE)
                .genres(Set.of(action))
                .platforms(Set.of(netflix))
                .build());

        String payload = """
                {
                  "query": "query Search($input: SearchMediaInput!) { searchMediaItems(input: $input) { items { name inUserList } hasMore nextCursor { name id } totalCount } }",
                  "variables": {
                    "input": {
                      "query": "Matrix",
                      "limit": 1
                    }
                  }
                }
                """;

        mockMvc.perform(post("/graphql")
                        .contentType("application/json")
                        .content(payload)
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.searchMediaItems.items.length()").value(1))
                .andExpect(jsonPath("$.data.searchMediaItems.items[0].inUserList").value(false))
                .andExpect(jsonPath("$.data.searchMediaItems.hasMore").value(true))
                .andExpect(jsonPath("$.data.searchMediaItems.nextCursor.name").value(item1.getName()))
                .andExpect(jsonPath("$.data.searchMediaItems.nextCursor.id").value(item1.getId()))
                .andExpect(jsonPath("$.data.searchMediaItems.totalCount").value(2));
    }

    @Test
    void searchMediaItems_withGenreAndPlatformFilters_shouldMatchExactly() throws Exception {
        Genre action = genreRepository.save(new Genre(null, "Action", null));
        Genre drama = genreRepository.save(new Genre(null, "Drama", null));

        Platform netflix = platformRepository.save(new Platform(null, "Netflix", null));
        Platform hbo = platformRepository.save(new Platform(null, "HBO", null));

        MediaItem item1 = mediaItemRepository.save(MediaItem.builder()
                .name("Qualified")
                .category(Category.MOVIE)
                .genres(Set.of(action, drama))
                .platforms(Set.of(netflix, hbo))
                .build());

        mediaItemRepository.save(MediaItem.builder()
                .name("Unqualified")
                .category(Category.MOVIE)
                .genres(Set.of(action))
                .platforms(Set.of(netflix))
                .build());

        UserMediaList listItem = new UserMediaList();
        listItem.setUser(user);
        listItem.setMediaItem(item1);
        userMediaListRepository.save(listItem);

        String payload = """
                {
                  "query": "query Search($input: SearchMediaInput!) { searchMediaItems(input: $input) { items { name inUserList } totalCount } }",
                  "variables": {
                    "input": {
                      "query": "",
                      "genreIds": [%d, %d],
                      "platformIds": [%d, %d]
                    }
                  }
                }
                """.formatted(
                action.getId(), drama.getId(),
                netflix.getId(), hbo.getId()
        );

        mockMvc.perform(post("/graphql")
                        .contentType("application/json")
                        .content(payload)
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.searchMediaItems.items.length()").value(1))
                .andExpect(jsonPath("$.data.searchMediaItems.items[0].name").value("Qualified"))
                .andExpect(jsonPath("$.data.searchMediaItems.items[0].inUserList").value(true))
                .andExpect(jsonPath("$.data.searchMediaItems.totalCount").value(1));
    }
}
