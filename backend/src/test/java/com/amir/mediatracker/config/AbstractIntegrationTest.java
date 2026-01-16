package com.amir.mediatracker.config;

import com.amir.mediatracker.entity.User;
import com.amir.mediatracker.repository.*;
import com.amir.mediatracker.security.JwtTokenProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.batch.test.context.SpringBatchTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;

@SpringBootTest
@AutoConfigureMockMvc
@SpringBatchTest
@TestPropertySource(properties = {
        "spring.batch.job.enabled=false" // Disable auto-run
})
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
    }


    @Autowired
    protected MockMvc mockMvc;
    @Autowired
    protected JwtTokenProvider jwtTokenProvider;
    @Autowired
    protected UserRepository userRepository;

    @Autowired
    protected NotificationRepository notificationRepository;
    @Autowired
    protected GenreRepository genreRepository;
    @Autowired
    protected PlatformRepository platformRepository;
    @Autowired
    protected MediaItemRepository mediaItemRepository;
    @Autowired
    protected ObjectMapper objectMapper;

    @Autowired
    protected UserMediaListRepository userMediaListRepository;

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
        userRepository.deleteAll();

        userRepository.save(admin);
        userRepository.save(user);

        adminToken = TestJwtUtil.token(jwtTokenProvider, admin.getUsername(), "ROLE_ADMIN");
        userToken = TestJwtUtil.token(jwtTokenProvider, user.getUsername(), "ROLE_USER");
    }
}
