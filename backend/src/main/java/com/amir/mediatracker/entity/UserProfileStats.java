package com.amir.mediatracker.entity;

public record UserProfileStats(
        long ratingsCount,
        long followersCount,
        boolean isFollowing
) {}
