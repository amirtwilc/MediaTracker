package com.amir.mediatracker.controller;

import com.amir.mediatracker.dto.Role;
import com.amir.mediatracker.entity.Notification;
import com.amir.mediatracker.entity.User;
import com.amir.mediatracker.repository.NotificationRepository;
import com.amir.mediatracker.repository.UserRepository;
import com.amir.mediatracker.security.JwtTokenProvider;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Collections;

import static org.assertj.core.api.AssertionsForInterfaceTypes.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Testcontainers
@AutoConfigureMockMvc
class NotificationControllerIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>("postgres:16");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    private final User user = initUser();
    private String userToken;

    @BeforeEach
    void setup() {
        //initDB
        notificationRepository.deleteAll();
        userRepository.deleteAll();
        // Create user UserDetails
        userRepository.save(user);
        org.springframework.security.core.userdetails.User regularUser =
                new org.springframework.security.core.userdetails.User(
                        user.getUsername(),
                        "password",
                        Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"))
                );

        Authentication userAuth = new UsernamePasswordAuthenticationToken(
                regularUser,
                null,
                regularUser.getAuthorities()
        );
        userToken = jwtTokenProvider.generateToken(userAuth);
    }

    @Test
    void getUnreadCount_returnsLimit() throws Exception {
        createNotification("test", false); //older than limit
        createNotification("test2", false);
        createNotification("test3", false); //only this will count
        mockMvc.perform(get("/notifications/unread-count")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(2));
    }

    @Test
    void getUnreadCount_returnsLessThanLimit() throws Exception {
        createNotification("test", false); //older than limit
        createNotification("test2", true);
        createNotification("test3", false); //only this will count
        mockMvc.perform(get("/notifications/unread-count")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(1));
    }

    @Test
    void getUnreadCount_returnsZero_becauseNoUnreadNotificationsInsideLimit() throws Exception {
        createNotification("test", false); //older than limit
        createNotification("test2", true);
        createNotification("test3", true);
        mockMvc.perform(get("/notifications/unread-count")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(0));
    }

    @Test
    void getUnreadCount_returnsZero_becauseNoUnreadNotifications() throws Exception {
        createNotification("test", true);
        createNotification("test2", true);
        createNotification("test3", true);
        mockMvc.perform(get("/notifications/unread-count")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(0));
    }

    @Test
    void getUnreadCount_returnsZero_becauseNoNotificationSaved() throws Exception {
        mockMvc.perform(get("/notifications/unread-count")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(0));
    }

    @Test
    void markAllAsRead_marksAll() throws Exception {
        createNotification("test", false);
        createNotification("test2", true);
        createNotification("test3", false);
        mockMvc.perform(put("/notifications/read-all")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isNoContent());

        assertThat(notificationRepository.findAll())
                .allMatch(Notification::getIsRead);
    }

    @Test
    void markAsRead_returnNotFound() throws Exception {
        mockMvc.perform(put("/notifications/{id}/read", 100)
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void markAsRead_marksNotification() throws Exception {
        Notification n = createNotification("test", false);
        mockMvc.perform(put("/notifications/{id}/read", n.getId())
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isRead").value(true));
        Notification updatedNotification = notificationRepository.findByIdAndUserId(n.getId(), user.getId()).get();
        Assertions.assertTrue(updatedNotification.getIsRead());
    }

    @Test
    void getNotifications_shouldReturnOnlyUnreadNotifications() throws Exception {
        createNotification("test", true);
        createNotification("test2", false);
        createNotification("test3", true);
        mockMvc.perform(get("/notifications?onlyUnread=true")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(MockMvcResultMatchers.jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].message").value("test2"));
    }

    @Test
    void getNotifications_shouldReturnNoNotifications_becauseOnlyUnreadIsTooOld() throws Exception {
        createNotification("test", false); //older than limit
        createNotification("test2", true);
        createNotification("test3", true);
        mockMvc.perform(get("/notifications?onlyUnread=true")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(MockMvcResultMatchers.jsonPath("$.length()").value(0));
    }

    @Test
    void getNotifications_shouldReturnNoNotifications_becauseOnlyUnreadIsTrue() throws Exception {
        createNotification("test", true);
        createNotification("test2", true);
        createNotification("test3", true);
        mockMvc.perform(get("/notifications?onlyUnread=true")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(MockMvcResultMatchers.jsonPath("$.length()").value(0));
    }

    @Test
    void getNotifications_shouldReturnNoNotifications_becauseNoNotificationSaved() throws Exception {
        mockMvc.perform(get("/notifications") //onlyUnread=false
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(MockMvcResultMatchers.jsonPath("$.length()").value(0));
    }

    @Test
    void getNotifications_shouldReturnOnlyTwoLatestNotifications() throws Exception {
        createNotification("test", false); //will not show
        createNotification("test2", true);
        createNotification("test3", false); //latest
        mockMvc.perform(get("/notifications") //onlyUnread=false
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(MockMvcResultMatchers.jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].message").value("test3"))
                .andExpect(jsonPath("$[1].message").value("test2"));
    }

    private Notification createNotification(String message, boolean isRead) {
        Notification n = new Notification();
        n.setMessage(message);
        n.setIsRead(isRead);
        n.setUser(user);
        return notificationRepository.save(n);
    }

    private User initUser() {
        User user = new User();
        user.setUsername("user");
        user.setEmail("user@example.com");
        user.setPasswordHash("password");
        user.setRole(Role.USER);
        return user;
    }
}
