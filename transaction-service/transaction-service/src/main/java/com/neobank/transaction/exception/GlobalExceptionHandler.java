package com.vjcloudbank.transaction.exception;

// ─────────────────────────────────────────────────────────────────
// GlobalExceptionHandler.java
//
// In Spring Boot, @ControllerAdvice catches exceptions thrown
// anywhere in the application and converts them to clean
// JSON error responses — similar to the error middleware
// we wrote in Express (the 4-parameter function at the bottom
// of app.js).
// ─────────────────────────────────────────────────────────────────

import com.vjcloudbank.transaction.dto.TransactionDto.ApiResponse;
import io.jsonwebtoken.JwtException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // Custom exception for business logic errors (insufficient funds etc.)
    public static class TransactionException extends RuntimeException {
        private final HttpStatus status;
        public TransactionException(String message, HttpStatus status) {
            super(message);
            this.status = status;
        }
        public HttpStatus getStatus() { return status; }
    }

    // Handle our custom business exceptions
    @ExceptionHandler(TransactionException.class)
    public ResponseEntity<ApiResponse<Void>> handleTransactionException(TransactionException ex) {
        return ResponseEntity
            .status(ex.getStatus())
            .body(ApiResponse.error(ex.getMessage()));
    }

    // Handle JWT errors (invalid/expired token)
    @ExceptionHandler(JwtException.class)
    public ResponseEntity<ApiResponse<Void>> handleJwtException(JwtException ex) {
        return ResponseEntity
            .status(HttpStatus.UNAUTHORIZED)
            .body(ApiResponse.error("Invalid or expired token. Please log in again."));
    }

    // Handle validation errors from @Valid annotations
    // Collects all field errors into a readable map
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationErrors(
            MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String field = ((FieldError) error).getField();
            String message = error.getDefaultMessage();
            errors.put(field, message);
        });
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", "Validation failed");
        response.put("errors", errors);
        return ResponseEntity.badRequest().body(response);
    }

    // Catch-all for unexpected errors
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGenericException(Exception ex) {
        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ApiResponse.error("Something went wrong. Please try again."));
    }
}
