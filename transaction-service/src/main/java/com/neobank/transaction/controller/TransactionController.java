package com.vjcloudbank.transaction.controller;

// ─────────────────────────────────────────────────────────────────
// TransactionController.java — REST API endpoints
//
// @RestController = handles HTTP requests, returns JSON
// @RequestMapping = base URL prefix for all endpoints
// @Valid = triggers validation rules from our DTOs
//
// Notice: every endpoint extracts the JWT token from the
// Authorization header and passes the userId to the service.
// The service uses userId for all ownership checks.
// ─────────────────────────────────────────────────────────────────

import com.vjcloudbank.transaction.config.JwtUtil;
import com.vjcloudbank.transaction.dto.TransactionDto.*;
import com.vjcloudbank.transaction.exception.GlobalExceptionHandler.TransactionException;
import com.vjcloudbank.transaction.service.TransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;
    private final JwtUtil jwtUtil;

    // ── Health Check ─────────────────────────────────────────────
    @GetMapping("/health")
    public ResponseEntity<ApiResponse<String>> health() {
        return ResponseEntity.ok(ApiResponse.ok("Transaction service is healthy", null));
    }

    // ── Deposit ──────────────────────────────────────────────────
    @PostMapping("/deposit")
    public ResponseEntity<ApiResponse<TransactionResponse>> deposit(
            @RequestHeader("Authorization") String authHeader,
            @Valid @RequestBody DepositRequest request) {

        UUID userId = extractUserId(authHeader);
        TransactionResponse result = transactionService.deposit(userId, request);
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(ApiResponse.ok("Deposit successful.", result));
    }

    // ── Withdrawal ───────────────────────────────────────────────
    @PostMapping("/withdraw")
    public ResponseEntity<ApiResponse<TransactionResponse>> withdraw(
            @RequestHeader("Authorization") String authHeader,
            @Valid @RequestBody WithdrawalRequest request) {

        UUID userId = extractUserId(authHeader);
        TransactionResponse result = transactionService.withdraw(userId, request);
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(ApiResponse.ok("Withdrawal successful.", result));
    }

    // ── Transfer ─────────────────────────────────────────────────
    @PostMapping("/transfer")
    public ResponseEntity<ApiResponse<List<TransactionResponse>>> transfer(
            @RequestHeader("Authorization") String authHeader,
            @Valid @RequestBody TransferRequest request) {

        UUID userId = extractUserId(authHeader);
        List<TransactionResponse> result = transactionService.transfer(userId, request);
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(ApiResponse.ok("Transfer successful.", result));
    }

    // ── Transaction History ──────────────────────────────────────
    @GetMapping("/history/{accountId}")
    public ResponseEntity<ApiResponse<List<TransactionResponse>>> getHistory(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID accountId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        UUID userId = extractUserId(authHeader);
        List<TransactionResponse> result = transactionService.getHistory(
            accountId, userId, page, size
        );
        return ResponseEntity.ok(ApiResponse.ok("Transaction history retrieved.", result));
    }

    // ── Helper: extract and validate JWT ─────────────────────────
    private UUID extractUserId(String authHeader) {
        String token = jwtUtil.extractTokenFromHeader(authHeader);
        if (token == null) {
            throw new TransactionException(
                "Authorization header missing.", HttpStatus.UNAUTHORIZED
            );
        }
        return jwtUtil.getUserIdFromToken(token);
    }
}
