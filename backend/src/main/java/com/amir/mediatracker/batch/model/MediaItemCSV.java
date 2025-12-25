package com.amir.mediatracker.batch.model;

import lombok.Data;

@Data
public class MediaItemCSV {
    private String category;
    private String name;
    private String genres;  // Comma-separated genre names
    private String platforms;  // Comma-separated platform names
}
