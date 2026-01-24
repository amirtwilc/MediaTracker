package com.amir.mediatracker.exception;

import graphql.GraphQLError;
import lombok.extern.slf4j.Slf4j;
import org.springframework.graphql.data.method.annotation.GraphQlExceptionHandler;
import org.springframework.graphql.execution.ErrorType;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@ControllerAdvice
public class GlobalGraphQlExceptionHandler {

    @GraphQlExceptionHandler(ResourceNotFoundException.class)
    public GraphQLError handleResourceNotFound(ResourceNotFoundException ex) {
        log.error("Resource not found: {}", ex.getMessage());
        return GraphQLError.newError()
                .message(ex.getMessage())
                .errorType(ErrorType.NOT_FOUND)
                .build();
    }

    @GraphQlExceptionHandler(DuplicateResourceException.class)
    public GraphQLError handleDuplicateResource(DuplicateResourceException ex) {
        log.error("Duplicate resource: {}", ex.getMessage());
        return GraphQLError.newError()
                .message(ex.getMessage())
                .errorType(ErrorType.BAD_REQUEST)
                .build();
    }

    @GraphQlExceptionHandler(BadRequestException.class)
    public GraphQLError handleBadRequest(BadRequestException ex) {
        log.error("Bad request: {}", ex.getMessage());
        return GraphQLError.newError()
                .message(ex.getMessage())
                .errorType(ErrorType.BAD_REQUEST)
                .build();
    }

    @GraphQlExceptionHandler(MethodArgumentNotValidException.class)
    public GraphQLError handleValidationErrors(MethodArgumentNotValidException ex) {
        log.error("Validation failed: {}", ex.getMessage());
        List errors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.toList());

        return GraphQLError.newError()
                .message("Validation failed: " + String.join(", ", errors))
                .errorType(ErrorType.BAD_REQUEST)
                .build();
    }

    @GraphQlExceptionHandler(Exception.class)
    public GraphQLError handleGenericException(Exception ex) {
        log.error("Generic exception: {}", ex.getMessage());
        return GraphQLError.newError()
                .message(ex.getMessage())
                .errorType(ErrorType.INTERNAL_ERROR)
                .build();
    }
}
