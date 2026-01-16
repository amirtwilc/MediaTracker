package com.amir.mediatracker.controller;

import com.amir.mediatracker.config.AbstractIntegrationTest;
import com.amir.mediatracker.entity.Notification;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.AssertionsForInterfaceTypes.assertThat;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class NotificationControllerIT extends AbstractIntegrationTest {

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
        assertTrue(updatedNotification.getIsRead());
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
                .andExpect(jsonPath("$.length()").value(1))
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
                .andExpect(jsonPath("$.length()").value(0));
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
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void getNotifications_shouldReturnNoNotifications_becauseNoNotificationSaved() throws Exception {
        mockMvc.perform(get("/notifications") //onlyUnread=false
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
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
                .andExpect(jsonPath("$.length()").value(2))
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
}
