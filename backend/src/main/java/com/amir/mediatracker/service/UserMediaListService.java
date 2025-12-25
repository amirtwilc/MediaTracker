package com.amir.mediatracker.service;

import com.amir.mediatracker.dto.request.UpdateMediaListRequest;
import com.amir.mediatracker.dto.response.GenreResponse;
import com.amir.mediatracker.dto.response.MediaItemResponse;
import com.amir.mediatracker.dto.response.PlatformResponse;
import com.amir.mediatracker.dto.response.UserMediaListResponse;
import com.amir.mediatracker.entity.MediaItem;
import com.amir.mediatracker.entity.User;
import com.amir.mediatracker.entity.UserMediaList;
import com.amir.mediatracker.exception.DuplicateResourceException;
import com.amir.mediatracker.exception.ResourceNotFoundException;
import com.amir.mediatracker.repository.MediaItemRepository;
import com.amir.mediatracker.repository.UserMediaListRepository;
import com.amir.mediatracker.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Slf4j
public class UserMediaListService {

    @Autowired
    private UserMediaListRepository userMediaListRepository;

    @Autowired
    private MediaItemRepository mediaItemRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RatingService ratingService;

    public List<UserMediaListResponse> getUserMediaList(Long userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("mediaItem.name").ascending());
        Page<UserMediaList> list = userMediaListRepository.findByUserId(userId, pageable);
        return list.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public UserMediaListResponse addMediaToList(Long userId, Long mediaItemId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        MediaItem mediaItem = mediaItemRepository.findById(mediaItemId)
                .orElseThrow(() -> new ResourceNotFoundException("Media item not found"));

        // Check if already in list
        Optional<UserMediaList> existing = userMediaListRepository
                .findByUserIdAndMediaItemId(userId, mediaItemId);

        if (existing.isPresent()) {
            throw new DuplicateResourceException("Media item already in your list");
        }

        UserMediaList listItem = new UserMediaList();
        listItem.setUser(user);
        listItem.setMediaItem(mediaItem);
        listItem.setExperienced(false);
        listItem.setWishToReexperience(false);

        UserMediaList saved = userMediaListRepository.save(listItem);
        return mapToResponse(saved);
    }

    @Transactional
    public UserMediaListResponse updateMediaListItem(
            Long userId, Long listItemId, UpdateMediaListRequest request) {

        UserMediaList listItem = userMediaListRepository
                .findByIdAndUserId(listItemId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Media list item not found"));

        if (request.getExperienced() != null) {
            listItem.setExperienced(request.getExperienced());
        }

        if (request.getWishToReexperience() != null) {
            listItem.setWishToReexperience(request.getWishToReexperience());
        }

        // If rating is being set/updated, use RatingService to trigger Kafka event
        if (request.getRating() != null) {
            listItem.setRating(request.getRating());
            ratingService.rateMedia(userId, listItem);
        }

        listItem.setUpdatedAt(LocalDateTime.now());
        UserMediaList saved = userMediaListRepository.save(listItem);
        return mapToResponse(saved);
    }

    @Transactional
    public void removeMediaFromList(Long userId, Long listItemId) {
        UserMediaList listItem = userMediaListRepository
                .findByIdAndUserId(listItemId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Media list item not found"));

        userMediaListRepository.delete(listItem);
    }

    private UserMediaListResponse mapToResponse(UserMediaList item) {
        return UserMediaListResponse.builder()
                .id(item.getId())
                .mediaItem(mapMediaItemToResponse(item.getMediaItem()))
                .experienced(item.getExperienced())
                .wishToReexperience(item.getWishToReexperience())
                .rating(item.getRating())
                .addedAt(item.getAddedAt())
                .updatedAt(item.getUpdatedAt())
                .build();
    }

    private MediaItemResponse mapMediaItemToResponse(MediaItem item) {
        return MediaItemResponse.builder()
                .id(item.getId())
                .category(item.getCategory())
                .name(item.getName())
                .genres(item.getGenres().stream()
                        .map(g -> GenreResponse.builder()
                                .id(g.getId())
                                .name(g.getName())
                                .build())
                        .collect(Collectors.toSet()))
                .platforms(item.getPlatforms().stream()
                        .map(p -> PlatformResponse.builder()
                                .id(p.getId())
                                .name(p.getName())
                                .build())
                        .collect(Collectors.toSet()))
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .build();
    }
}
