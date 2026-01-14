package com.amir.mediatracker.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
