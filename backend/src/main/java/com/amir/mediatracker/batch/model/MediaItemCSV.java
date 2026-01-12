package com.amir.mediatracker.batch.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class MediaItemCSV {
    private String category;
    private String name;
    private String year;
    private String genres;  // Comma-separated genre names
    private String platforms;  // Comma-separated platform names
}
