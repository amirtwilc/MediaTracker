package com.amir.mediatracker.service;

import com.amir.mediatracker.dto.request.UserSettingsRequest;
import com.amir.mediatracker.dto.response.UserSettingsResponse;
import com.amir.mediatracker.entity.User;
import com.amir.mediatracker.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.AssertionsForInterfaceTypes.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserSettingsServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserSettingsService userSettingsService;

    @Test
    void getSettings_shouldReturnSettings() {
        User user = new User();
        user.setIsInvisible(true);
        user.setShowEmail(false);

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        UserSettingsResponse response =
                userSettingsService.getSettings(1L);

        assertThat(response.getIsInvisible()).isTrue();
        assertThat(response.getShowEmail()).isFalse();
    }

    @Test
    void updateSettings_shouldUpdateUser() {
        User user = new User();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        UserSettingsRequest request = new UserSettingsRequest();
        request.setIsInvisible(true);
        request.setShowEmail(false);

        UserSettingsResponse response =
                userSettingsService.updateSettings(1L, request);

        assertThat(response.getIsInvisible()).isTrue();
        assertThat(user.getIsInvisible()).isTrue();
    }
}

