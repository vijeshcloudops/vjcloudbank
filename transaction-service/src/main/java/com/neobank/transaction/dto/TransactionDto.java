package com.vjcloudbank.transaction.dto;

// ─────────────────────────────────────────────────────────────────
// DTOs = Data Transfer Objects
//
// DTOs define the SHAPE of data coming in (requests)
// and going out (responses). Similar to:
//   - Pydantic schemas in Python/FastAPI
//   - express-validator rules in Node.js
//
// We use separate DTOs from entities so we control exactly
// what data is exposed — never accidentally leaking
// internal fields like balance_before to the client.
// ─────────────────────────────────────────────────────────────────

import jakarta.validation.constraints.*;
import lombok.Data;
import lombok.Builder;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import com.vjcloudbank.transaction.model.Transaction;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public class TransactionDto {

    // ── Request: Deposit ─────────────────────────────────────────
    @Data
    public static class DepositRequest {
        @NotNull(message = "Account ID is required")
        private UUID accountId;

        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0.01", message = "Amount must be at least 0.01")
        @DecimalMax(value = "1000000.00", message = "Amount cannot exceed 1,000,000")
        private BigDecimal amount;

        private String description;
    }

    // ── Request: Withdrawal ──────────────────────────────────────
    @Data
    public static class WithdrawalRequest {
        @NotNull(message = "Account ID is required")
        private UUID accountId;

        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0.01", message = "Amount must be at least 0.01")
        @DecimalMax(value = "1000000.00", message = "Amount cannot exceed 1,000,000")
        private BigDecimal amount;

        private String description;
    }

    // ── Request: Transfer ────────────────────────────────────────
    @Data
    public static class TransferRequest {
        @NotNull(message = "Source account ID is required")
        private UUID fromAccountId;

        @NotNull(message = "Destination account ID is required")
        private UUID toAccountId;

        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0.01", message = "Amount must be at least 0.01")
        @DecimalMax(value = "1000000.00", message = "Amount cannot exceed 1,000,000")
        private BigDecimal amount;

        private String description;
    }

    // ── Response: Single Transaction ─────────────────────────────
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TransactionResponse {
        private UUID id;
        private UUID accountId;
        private String type;
        private BigDecimal amount;
        private BigDecimal balanceBefore;
        private BigDecimal balanceAfter;
        private UUID referenceId;
        private UUID relatedAccountId;
        private String description;
        private String currency;
        private String status;
        private LocalDateTime createdAt;

        // Convert from entity to DTO
        public static TransactionResponse from(Transaction t) {
            return TransactionResponse.builder()
                .id(t.getId())
                .accountId(t.getAccountId())
                .type(t.getType().name())
                .amount(t.getAmount())
                .balanceBefore(t.getBalanceBefore())
                .balanceAfter(t.getBalanceAfter())
                .referenceId(t.getReferenceId())
                .relatedAccountId(t.getRelatedAccountId())
                .description(t.getDescription())
                .currency(t.getCurrency())
                .status(t.getStatus().name())
                .createdAt(t.getCreatedAt())
                .build();
        }
    }

    // ── Response: API wrapper ─────────────────────────────────────
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ApiResponse<T> {
        private boolean success;
        private String message;
        private T data;

        public static <T> ApiResponse<T> ok(String message, T data) {
            return ApiResponse.<T>builder()
                .success(true).message(message).data(data).build();
        }

        public static <T> ApiResponse<T> error(String message) {
            return ApiResponse.<T>builder()
                .success(false).message(message).build();
        }
    }
}
