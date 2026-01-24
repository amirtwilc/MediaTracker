package com.amir.mediatracker.config;

import com.amir.mediatracker.dto.Category;
import com.amir.mediatracker.dto.Role;
import com.amir.mediatracker.entity.Genre;
import com.amir.mediatracker.entity.MediaItem;
import com.amir.mediatracker.entity.Platform;
import com.amir.mediatracker.entity.User;
import com.amir.mediatracker.kafka.RatingConsumer;
import com.amir.mediatracker.repository.*;
import com.amir.mediatracker.security.JwtTokenProvider;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.batch.test.context.SpringBatchTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;

import java.time.LocalDateTime;
import java.util.Set;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@SpringBatchTest
@TestPropertySource(properties = {
        "spring.batch.job.enabled=false" // Disable auto-run
})
@EmbeddedKafka(
        partitions = 3,
        topics = {"media-ratings", "media-ratings-dlt"},
        brokerProperties = {
                "listeners=PLAINTEXT://localhost:0",
                "auto.create.topics.enable=true"
        }
)
public abstract class AbstractIntegrationTest {

    private static final PostgreSQLContainer<?> POSTGRES;

    static {
        POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);

        // Kafka configuration
        registry.add("spring.kafka.consumer.auto-offset-reset", () -> "earliest");
        registry.add("spring.kafka.consumer.properties.spring.json.trusted.packages", () -> "*");
        registry.add("spring.kafka.producer.key-serializer",
                () -> "org.apache.kafka.common.serialization.LongSerializer");
        registry.add("spring.kafka.producer.value-serializer",
                () -> "org.springframework.kafka.support.serializer.JsonSerializer");
        registry.add("spring.kafka.consumer.key-deserializer",
                () -> "org.apache.kafka.common.serialization.LongDeserializer");
        registry.add("spring.kafka.consumer.value-deserializer",
                () -> "org.springframework.kafka.support.serializer.JsonDeserializer");
        registry.add("spring.kafka.consumer.properties.spring.json.value.default.type",
                () -> "com.amir.mediatracker.kafka.event.RatingEvent");
    }


    @Autowired
    protected MockMvc mockMvc;
    @Autowired
    protected JwtTokenProvider jwtTokenProvider;
    @Autowired
    protected UserRepository userRepository;

    @Autowired
    protected UserFollowRepository userFollowRepository;
    @Autowired
    protected NotificationRepository notificationRepository;
    @Autowired
    protected GenreRepository genreRepository;
    @Autowired
    protected PlatformRepository platformRepository;
    @Autowired
    protected MediaItemRepository mediaItemRepository;
    @Autowired
    protected UserMediaListRepository userMediaListRepository;
    @Autowired
    protected UserSearchRepository userSearchRepository;
    @Autowired
    protected ObjectMapper objectMapper;
    @Autowired
    protected KafkaTemplate<Long, Object> kafkaTemplate;


    protected final User admin = TestJwtUtil.initAdmin();
    protected String adminToken;
    protected final User user = TestJwtUtil.initUser();
    protected String userToken;

    @BeforeEach
    void setupTokens() {
        mediaItemRepository.deleteAll();
        genreRepository.deleteAll();
        platformRepository.deleteAll();
        userMediaListRepository.deleteAll();
        userFollowRepository.deleteAll();
        userRepository.deleteAll();

        userRepository.save(admin);
        userRepository.save(user);

        adminToken = TestJwtUtil.token(jwtTokenProvider, admin.getUsername(), "ROLE_ADMIN");
        userToken = TestJwtUtil.token(jwtTokenProvider, user.getUsername(), "ROLE_USER");
    }

    protected String graphql(String body) throws Exception {
        return mockMvc.perform(post("/graphql")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    protected <T> T mockMvcJsonToObject(String json, String jsonSubStringStart, Class<T> classType) throws JsonProcessingException {
        json = json.substring(
                json.indexOf(jsonSubStringStart) + jsonSubStringStart.length(),
                json.length() - 2 //remove last 2 '}'
        );
        return objectMapper.readValue(json, classType);
    }

    protected <T> T mockMvcJsonToObject(
            String json,
            String jsonSubStringStart,
            TypeReference<T> typeRef) throws JsonProcessingException {

        json = json.substring(
                json.indexOf(jsonSubStringStart) + jsonSubStringStart.length(),
                json.length() - 2 //remove last 2 '}'
        );

        return objectMapper.readValue(json, typeRef);
    }

    protected User saveUser(String username) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(username + "@example.com");
        user.setPasswordHash("password");
        user.setRole(Role.USER);
        user.setLastActive(LocalDateTime.now());
        return userRepository.save(user);
    }

    protected MediaItem saveBasicMediaItem(String name) {
        return mediaItemRepository.save(MediaItem.builder()
                        .name(name)
                        .category(Category.MOVIE)
                        .genres(Set.of(saveBasicGenre("Action")))
                        .platforms(Set.of(saveBasicPlatform("Netflix")))
                .build());
    }

    protected Genre saveBasicGenre(String name) {
        Genre genre = genreRepository.findByNameIgnoreCase(name).orElse(null);

        if (genre != null) {
            return genre;
        } else {
            genre = new Genre(null, name, LocalDateTime.now());
            return genreRepository.save(genre);
        }
    }

    protected Platform saveBasicPlatform(String name) {
        Platform platform = platformRepository.findByNameIgnoreCase(name).orElse(null);

        if (platform != null) {
            return platform;
        } else {
            platform = new Platform(null, name, LocalDateTime.now());
            return platformRepository.save(platform);
        }
    }

    protected <T> void sendKafkaMessage(T value) {
        kafkaTemplate.send("media-ratings", user.getId(), value);
    }

    /**
     * Helper method to wait for Kafka consumer to process messages
     */
    protected void waitForKafkaConsumer() throws InterruptedException {
        Thread.sleep(300L);
    }
}
