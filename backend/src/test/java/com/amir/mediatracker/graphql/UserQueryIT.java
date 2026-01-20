package com.amir.mediatracker.graphql;

import com.amir.mediatracker.config.AbstractIntegrationTest;
import com.amir.mediatracker.dto.Category;
import com.amir.mediatracker.dto.response.MediaSearchResponse;
import com.amir.mediatracker.dto.response.UserMediaListSearchResponse;
import com.amir.mediatracker.entity.Genre;
import com.amir.mediatracker.entity.MediaItem;
import com.amir.mediatracker.entity.Platform;
import com.amir.mediatracker.entity.UserMediaList;
import com.amir.mediatracker.graphql.dto.result.MediaPageResult;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

public class UserQueryIT extends AbstractIntegrationTest {

    private final String SEARCH_MEDIA_ITEMS_JSON_START = "\"searchMediaItems\":";
    private final String SEARCH_MEDIA_ITEMS_SORTED_JSON_START = "\"searchMediaItemsSorted\":";
    private final String USER_MEDIA_LIST_CURSOR_JSON_START = "\"userMediaListCursor\":";



    @Test
    void userMediaListCursor_shouldReturnResultsWithCursor_whileMaxLimitReached() throws Exception {
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


        UserMediaList listItem1 = new UserMediaList();
        listItem1.setUser(user);
        listItem1.setMediaItem(item1);
        userMediaListRepository.save(listItem1);
        UserMediaList listItem2 = new UserMediaList();
        listItem2.setUser(user);
        listItem2.setMediaItem(item2);
        userMediaListRepository.save(listItem2);
        UserMediaList listItem3 = new UserMediaList();
        listItem3.setUser(user);
        listItem3.setMediaItem(item3);
        userMediaListRepository.save(listItem3);

        String resultJson = graphql("""
                {
                  "query": "query Search($input: UserMediaListInput!) { userMediaListCursor(input: $input) { items { mediaItem { name } } hasMore  totalCount } }",
                  "variables": {
                    "input": {
                      "searchQuery": "Matrix",
                      "limit": 3
                    }
                  }
                }
                """); //requested 3, but max limit is 2 (in application.yaml)

        UserMediaListSearchResponse response = mockMvcJsonToObject(resultJson,
                USER_MEDIA_LIST_CURSOR_JSON_START,
                UserMediaListSearchResponse.class);

        assertEquals(2, response.getItems().size());
        assertTrue(response.isHasMore());
        assertEquals(3, response.getTotalCount());
    }

    @Test
    void userMediaListCursor_shouldReturnResultsWithCursor() throws Exception {

        MediaItem item1 = mediaItemRepository.save(MediaItem.builder()
                .name("Matrix")
                .category(Category.MOVIE)
                .build());

        MediaItem item2 = mediaItemRepository.save(MediaItem.builder()
                .name("Matrix Reloaded")
                .category(Category.MOVIE)
                .build());

        UserMediaList listItem1 = new UserMediaList();
        listItem1.setUser(user);
        listItem1.setMediaItem(item1);
        userMediaListRepository.save(listItem1);
        UserMediaList listItem2 = new UserMediaList();
        listItem2.setUser(user);
        listItem2.setMediaItem(item2);
        userMediaListRepository.save(listItem2);

        String resultJson = graphql("""
                {
                  "query": "query Search($input: UserMediaListInput!) { userMediaListCursor(input: $input) { items { mediaItem { id name } } hasMore nextCursor { name id } totalCount } }",
                  "variables": {
                    "input": {
                      "searchQuery": "Matrix",
                      "limit": 1
                    }
                  }
                }
                """);

        UserMediaListSearchResponse response = mockMvcJsonToObject(resultJson,
                USER_MEDIA_LIST_CURSOR_JSON_START,
                UserMediaListSearchResponse.class);

        System.out.println("extract: " + mediaItemRepository.findAll());
        assertEquals(1, response.getItems().size());
        assertTrue(response.isHasMore());
        assertEquals(item1.getName(), response.getNextCursor().getName());
        assertEquals(item1.getId(), response.getNextCursor().getId());
        assertEquals(2, response.getTotalCount());
    }

    @Test
    void userMediaListCursor_withGenreAndPlatformFilters_shouldMatchExactly() throws Exception {
        Genre action = genreRepository.save(new Genre(null, "Action", null));
        Genre drama = genreRepository.save(new Genre(null, "Drama", null));
        Genre comedy = genreRepository.save(new Genre(null, "Comedy", null));

        Platform netflix = platformRepository.save(new Platform(null, "Netflix", null));
        Platform hbo = platformRepository.save(new Platform(null, "HBO", null));

        MediaItem item1 = mediaItemRepository.save(MediaItem.builder()
                .name("Qualified")
                .category(Category.MOVIE)
                .genres(Set.of(action, comedy, drama))
                .platforms(Set.of(netflix, hbo))
                .build());

        MediaItem item2 = mediaItemRepository.save(MediaItem.builder()
                .name("Unqualified")
                .category(Category.MOVIE)
                .genres(Set.of(action, drama))
                .platforms(Set.of(netflix)) //no hbo
                .build());

        UserMediaList listItem1 = new UserMediaList();
        listItem1.setUser(user);
        listItem1.setMediaItem(item1);
        userMediaListRepository.save(listItem1);
        UserMediaList listItem2 = new UserMediaList();
        listItem2.setUser(user);
        listItem2.setMediaItem(item2);
        userMediaListRepository.save(listItem2);

        String resultJson = graphql("""
                {
                  "query": "query Search($input: UserMediaListInput!) { userMediaListCursor(input: $input) { items { mediaItem { name } } totalCount } }",
                  "variables": {
                    "input": {
                      "searchQuery": "",
                      "genreIds": [%d, %d],
                      "platformIds": [%d, %d]
                    }
                  }
                }
                """.formatted(
                action.getId(), drama.getId(), //deliberately no comedy.getID()
                netflix.getId(), hbo.getId()
        ));

        UserMediaListSearchResponse response = mockMvcJsonToObject(resultJson,
                USER_MEDIA_LIST_CURSOR_JSON_START,
                UserMediaListSearchResponse.class);

        assertEquals(1, response.getItems().size());
        assertEquals("Qualified", response.getItems().getFirst().getMediaItem().getName());
        assertEquals(1, response.getTotalCount());
    }

    @Test
    void searchMediaItemsSorted_paginatesCorrectly() throws Exception {
        for (int i = 0; i < 30; i++) {
            mediaItemRepository.save(MediaItem.builder()
                            .name("item " + i)
                            .category(Category.MOVIE)
                    .build());
        }


        String resultJson = graphql("""
                {
                  "query": "query Search($input: SearchMediaSortedInput!) { searchMediaItemsSorted(input: $input) { totalPages totalElements number size } }",
                  "variables": {
                    "input": {
                        "query": "",
                        "page": 1,
                        "size": 3
                    }
                  }
                }
                """
        ); //size is 3 but limit is 2


        MediaPageResult response = mockMvcJsonToObject(resultJson,
                SEARCH_MEDIA_ITEMS_SORTED_JSON_START,
                MediaPageResult.class);

        assertEquals(1, response.getNumber());
        assertEquals(2, response.getSize());
        assertEquals(15, response.getTotalPages());
        assertEquals(30, response.getTotalElements());
    }

    @Test
    void searchMediaItemsSorted_isDeterministic() throws Exception {
        MediaItem a = new MediaItem();
        a.setName("Inside Out 2");
        a.setYear(2024);
        a.setCategory(Category.MOVIE);
        mediaItemRepository.save(a);

        MediaItem b = new MediaItem();
        b.setName("Wicked");
        b.setYear(2024);
        b.setCategory(Category.MOVIE);
        mediaItemRepository.save(b);

        String resultJson = graphql("""
                {
                  "query": "query Search($input: SearchMediaSortedInput!) { searchMediaItemsSorted(input: $input) { content { id } } }",
                  "variables": {
                    "input": {
                        "query": "",
                        "sortBy": "YEAR"
                    }
                  }
                }
                """
        );


        MediaPageResult response = mockMvcJsonToObject(resultJson,
                SEARCH_MEDIA_ITEMS_SORTED_JSON_START,
                MediaPageResult.class);

        assertEquals(a.getId(), response.getContent().getFirst().getId());
        assertEquals(b.getId(), response.getContent().get(1).getId());
    }

    @Test
    void searchMediaItemsSorted_filtersByCategoryAndGenreAndPlatformAndSortByAvgRating() throws Exception {
        Genre g1 = genreRepository.save(new Genre(null, "Action", LocalDateTime.now()));
        Genre g2 = genreRepository.save(new Genre(null, "Horror", LocalDateTime.now()));
        Platform p1 = platformRepository.save(new Platform(null, "Netflix", LocalDateTime.now()));
        Platform p2 = platformRepository.save(new Platform(null, "HBO Max", LocalDateTime.now()));

        //should return
        MediaItem m1 = new MediaItem();
        m1.setName("Interstellar");
        m1.setGenres(Set.of(g1));
        m1.setPlatforms(Set.of(p1));
        m1.setAvgRating(BigDecimal.valueOf(8.8));
        m1.setCategory(Category.MOVIE);
        mediaItemRepository.save(m1);

        //should not return
        MediaItem m3 = new MediaItem();
        m3.setName("Wicked");
        m3.setGenres(Set.of(g2));
        m3.setPlatforms(Set.of(p1));
        m3.setAvgRating(BigDecimal.valueOf(8.1));
        m3.setCategory(Category.MOVIE);
        mediaItemRepository.save(m3);

        //should not return
        MediaItem m4 = new MediaItem();
        m4.setName("Alien");
        m4.setGenres(Set.of(g1));
        m4.setPlatforms(Set.of(p2));
        m4.setAvgRating(BigDecimal.valueOf(8.6));
        m4.setCategory(Category.MOVIE);
        mediaItemRepository.save(m4);

        //should not return
        MediaItem m5 = new MediaItem();
        m5.setName("Ratchet & Clank: Rift Apart");
        m5.setGenres(Set.of(g1));
        m5.setPlatforms(Set.of(p2));
        m5.setAvgRating(BigDecimal.valueOf(10));
        m5.setCategory(Category.GAME);
        mediaItemRepository.save(m5);

        //should return
        MediaItem m2 = new MediaItem();
        m2.setName("Avengers");
        m2.setGenres(Set.of(g1));
        m2.setPlatforms(Set.of(p1));
        m2.setAvgRating(BigDecimal.valueOf(8.5));
        m2.setCategory(Category.MOVIE);
        mediaItemRepository.save(m2);

        String resultJson = graphql("""
                {
                  "query": "query Search($input: SearchMediaSortedInput!) { searchMediaItemsSorted(input: $input) { content { name } } }",
                  "variables": {
                    "input": {
                        "query": "",
                        "categories": ["MOVIE"],
                        "genreIds": [%d],
                        "platformIds": [%d],
                        "sortBy": "AVG_RATING",
                        "sortDirection": "DESC"
                    }
                  }
                }
                """.formatted(g1.getId(), p1.getId())
        );



        MediaPageResult response = mockMvcJsonToObject(resultJson,
                SEARCH_MEDIA_ITEMS_SORTED_JSON_START,
                MediaPageResult.class);

        assertEquals(2, response.getContent().size());
        assertEquals("Interstellar", response.getContent().getFirst().getName());
        assertEquals("Avengers", response.getContent().get(1).getName());
    }

    @Test
    void searchMediaItemsSorted_filtersByGenreIntersection() throws Exception {
        Genre g1 = genreRepository.save(new Genre(null, "Sci-Fi", LocalDateTime.now()));
        Genre g2 = genreRepository.save(new Genre(null, "Action", LocalDateTime.now()));

        MediaItem m1 = new MediaItem();
        m1.setName("Interstellar");
        m1.setGenres(Set.of(g1, g2));
        m1.setCategory(Category.MOVIE);
        mediaItemRepository.save(m1);

        //should not return
        MediaItem m2 = new MediaItem();
        m2.setName("Avengers");
        m2.setYear(2012);
        m2.setCategory(Category.MOVIE);
        mediaItemRepository.save(m2);

        //should not return
        MediaItem m3 = new MediaItem();
        m3.setName("Alien");
        m3.setYear(1979);
        m3.setCategory(Category.MOVIE);
        mediaItemRepository.save(m3);

        String resultJson = graphql("""
                {
                  "query": "query Search($input: SearchMediaSortedInput!) { searchMediaItemsSorted(input: $input) { content { name } } }",
                  "variables": {
                    "input": {
                        "query": "",
                        "genreIds": [%d, %d]
                    }
                  }
                }
                """.formatted(g1.getId(), g2.getId())
        );



        MediaPageResult response = mockMvcJsonToObject(resultJson,
                SEARCH_MEDIA_ITEMS_SORTED_JSON_START,
                MediaPageResult.class);

        assertEquals(1, response.getContent().size());
        assertEquals("Interstellar", response.getContent().getFirst().getName());
    }

    @Test
    void searchMediaItemsSorted_returnsUnfilteredSortedByName() throws Exception {
        MediaItem m1 = new MediaItem();
        m1.setName("Avatar");
        m1.setYear(2009);
        m1.setCategory(Category.MOVIE);
        mediaItemRepository.save(m1);

        MediaItem m2 = new MediaItem();
        m2.setName("Marvel's Avengers");
        m2.setYear(2020);
        m2.setCategory(Category.GAME);
        mediaItemRepository.save(m2);

        //should not return
        MediaItem m3 = new MediaItem();
        m3.setName("Alien");
        m3.setYear(1979);
        m3.setCategory(Category.MOVIE);
        mediaItemRepository.save(m3);

        String resultJson = graphql("""
                {
                  "query": "query Search($input: SearchMediaSortedInput!) { searchMediaItemsSorted(input: $input) { content { name } totalElements } }",
                  "variables": {
                    "input": {
                      "query": "Av",
                      "sortBy": "NAME",
                      "sortDirection": "ASC"
                    }
                  }
                }
                """);

        MediaPageResult response = mockMvcJsonToObject(resultJson,
                SEARCH_MEDIA_ITEMS_SORTED_JSON_START,
                MediaPageResult.class);

        assertEquals(2, response.getContent().size());
        assertEquals("Avatar", response.getContent().getFirst().getName());
        assertEquals("Marvel's Avengers", response.getContent().get(1).getName());
    }

    @Test
    void searchMediaItems_shouldReturnResultsWithCursor_whileMaxLimitReached() throws Exception {
        Genre action = genreRepository.save(new Genre(null, "Action", null));
        Platform netflix = platformRepository.save(new Platform(null, "Netflix", null));

        mediaItemRepository.save(MediaItem.builder()
                .name("Matrix")
                .category(Category.MOVIE)
                .genres(Set.of(action))
                .platforms(Set.of(netflix))
                .build());

        mediaItemRepository.save(MediaItem.builder()
                .name("Matrix Reloaded")
                .category(Category.MOVIE)
                .genres(Set.of(action))
                .platforms(Set.of(netflix))
                .build());

        mediaItemRepository.save(MediaItem.builder()
                .name("Matrix Revolution")
                .category(Category.MOVIE)
                .genres(Set.of(action))
                .platforms(Set.of(netflix))
                .build());

        String resultJson = graphql("""
                {
                  "query": "query Search($input: SearchMediaInput!) { searchMediaItems(input: $input) { items { name } hasMore  totalCount } }",
                  "variables": {
                    "input": {
                      "query": "Matrix",
                      "limit": 3
                    }
                  }
                }
                """); //requested 3, but max limit is 2 (in application.yaml)

        MediaSearchResponse response = mockMvcJsonToObject(resultJson,
                SEARCH_MEDIA_ITEMS_JSON_START,
                MediaSearchResponse.class);

        assertEquals(2, response.getItems().size());
        assertTrue(response.isHasMore());
        assertEquals(3, response.getTotalCount());
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

        mediaItemRepository.save(MediaItem.builder()
                .name("Matrix Reloaded")
                .category(Category.MOVIE)
                .genres(Set.of(action))
                .platforms(Set.of(netflix))
                .build());

        String resultJson = graphql("""
                {
                  "query": "query Search($input: SearchMediaInput!) { searchMediaItems(input: $input) { items { name inUserList } hasMore nextCursor { name id } totalCount } }",
                  "variables": {
                    "input": {
                      "query": "Matrix",
                      "limit": 1
                    }
                  }
                }
                """);

        MediaSearchResponse response = mockMvcJsonToObject(resultJson,
                SEARCH_MEDIA_ITEMS_JSON_START,
                MediaSearchResponse.class);

        assertEquals(1, response.getItems().size());
        assertFalse(response.getItems().getFirst().getInUserList());
        assertTrue(response.isHasMore());
        assertEquals(item1.getName(), response.getNextCursor().getName());
        assertEquals(item1.getId(), response.getNextCursor().getId());
        assertEquals(2, response.getTotalCount());
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

        String resultJson = graphql("""
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
        ));

        MediaSearchResponse response = mockMvcJsonToObject(resultJson,
                SEARCH_MEDIA_ITEMS_JSON_START,
                MediaSearchResponse.class);

        assertEquals(1, response.getItems().size());
        assertEquals("Qualified", response.getItems().getFirst().getName());
        assertTrue(response.getItems().getFirst().getInUserList());
        assertEquals(1, response.getTotalCount());
    }
}
