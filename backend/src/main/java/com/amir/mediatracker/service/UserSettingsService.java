package com.amir.mediatracker.service;

import com.amir.mediatracker.dto.request.UserSettingsRequest;
import com.amir.mediatracker.dto.response.UserSettingsResponse;
import com.amir.mediatracker.entity.User;
import com.amir.mediatracker.exception.ResourceNotFoundException;
import com.amir.mediatracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserSettingsService {

    private final UserRepository userRepository;

    @Transactional
    public UserSettingsResponse updateSettings(Long userId, UserSettingsRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        user.setIsInvisible(request.getIsInvisible());
        user.setShowEmail(request.getShowEmail());

        return UserSettingsResponse.builder()
                .isInvisible(user.getIsInvisible())
                .showEmail(user.getShowEmail())
                .build();
    }

    public UserSettingsResponse getSettings(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return UserSettingsResponse.builder()
                .isInvisible(user.getIsInvisible())
                .showEmail(user.getShowEmail())
                .build();
    }
}