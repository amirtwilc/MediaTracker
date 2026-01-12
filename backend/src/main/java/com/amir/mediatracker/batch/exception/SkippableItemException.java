package com.amir.mediatracker.batch.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class SkippableItemException extends RuntimeException {
    public SkippableItemException(String message) {
        super(message);
    }
}
