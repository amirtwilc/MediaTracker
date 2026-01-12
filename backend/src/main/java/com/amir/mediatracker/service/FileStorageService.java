package com.amir.mediatracker.service;

import com.amir.mediatracker.exception.BadRequestException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@Component
@Slf4j
public class FileStorageService {

    public String storeTempFile(MultipartFile file) {
        try {
            Path tempFile = Files.createTempFile(
                    "media-import-", System.currentTimeMillis() + "-" + file.getOriginalFilename()
            );
            Files.write(tempFile, file.getBytes());
            return tempFile.toAbsolutePath().toString();
        } catch (IOException e) {
            throw new BadRequestException("Failed to store uploaded file");
        }
    }
}
