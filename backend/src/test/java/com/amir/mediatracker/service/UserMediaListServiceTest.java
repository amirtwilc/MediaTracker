package com.amir.mediatracker.service;

import com.amir.mediatracker.dto.response.UserMediaListResponse;
import com.amir.mediatracker.entity.*;
import com.amir.mediatracker.exception.ResourceNotFoundException;
import com.amir.mediatracker.repository.UserMediaListRepository;
import com.amir.mediatracker.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.AssertionsForInterfaceTypes.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserMediaListServiceTest {

    @Mock
    private UserMediaListRepository userMediaListRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserMediaListService userMediaListService;
}

