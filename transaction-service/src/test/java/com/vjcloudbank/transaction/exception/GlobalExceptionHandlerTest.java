package com.vjcloudbank.transaction.exception;

// ─────────────────────────────────────────────────────────────────
// GlobalExceptionHandlerTest.java
//
// Unit tests for the exception handler — makes sure our custom
// exceptions get mapped to the right HTTP status codes with
// the right JSON payload shape.
// ─────────────────────────────────────────────────────────────────

import com.vjcloudbank.transaction.dto.TransactionDto.ApiResponse;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("GlobalExceptionHandler unit tests")
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    @DisplayName("TransactionException maps to configured HTTP status")
    void transactionException_mapsToConfiguredStatus() {
        GlobalExceptionHandler.TransactionException ex =
            new GlobalExceptionHandler.TransactionException(
                "Insufficient funds",
                HttpStatus.BAD_REQUEST
            );

        ResponseEntity<ApiResponse<Void>> response =
            handler.handleTransactionException(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getMessage()).contains("Insufficient funds");
    }

    @Test
    @DisplayName("TransactionException with NOT_FOUND returns 404")
    void transactionException_notFoundReturns404() {
        GlobalExceptionHandler.TransactionException ex =
            new GlobalExceptionHandler.TransactionException(
                "Account not found",
                HttpStatus.NOT_FOUND
            );

        ResponseEntity<ApiResponse<Void>> response =
            handler.handleTransactionException(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("JwtException always maps to 401 UNAUTHORIZED")
    void jwtException_mapsTo401() {
        JwtException ex = new JwtException("Token expired");

        ResponseEntity<ApiResponse<Void>> response =
            handler.handleJwtException(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getMessage()).contains("log in again");
    }
}
