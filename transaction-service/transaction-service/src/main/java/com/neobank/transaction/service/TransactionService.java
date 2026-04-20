package com.vjcloudbank.transaction.service;

import com.vjcloudbank.transaction.dto.TransactionDto.*;
import com.vjcloudbank.transaction.exception.GlobalExceptionHandler.TransactionException;
import com.vjcloudbank.transaction.model.Transaction;
import com.vjcloudbank.transaction.model.Transaction.TransactionType;
import com.vjcloudbank.transaction.repository.TransactionRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransactionService {

    private final TransactionRepository transactionRepository;

    @PersistenceContext
    private EntityManager entityManager;

    // ── DEPOSIT ──────────────────────────────────────────────────
    @Transactional
    public TransactionResponse deposit(UUID userId, DepositRequest request) {
        log.info("Deposit request: userId={}, accountId={}, amount={}",
            userId, request.getAccountId(), request.getAmount());

        BigDecimal[] balance = getBalanceAndVerifyOwnership(request.getAccountId(), userId);
        BigDecimal currentBalance = balance[0];
        BigDecimal newBalance = currentBalance.add(request.getAmount());

        updateAccountBalance(request.getAccountId(), newBalance);

        Transaction transaction = Transaction.builder()
            .accountId(request.getAccountId())
            .userId(userId)
            .type(TransactionType.DEPOSIT)
            .amount(request.getAmount())
            .balanceBefore(currentBalance)
            .balanceAfter(newBalance)
            .description(request.getDescription() != null ? request.getDescription() : "Deposit")
            .build();

        transaction = transactionRepository.save(transaction);
        log.info("Deposit completed: transactionId={}", transaction.getId());
        return TransactionResponse.from(transaction);
    }

    // ── WITHDRAWAL ───────────────────────────────────────────────
    @Transactional
    public TransactionResponse withdraw(UUID userId, WithdrawalRequest request) {
        log.info("Withdrawal request: userId={}, accountId={}, amount={}",
            userId, request.getAccountId(), request.getAmount());

        BigDecimal[] balance = getBalanceAndVerifyOwnership(request.getAccountId(), userId);
        BigDecimal currentBalance = balance[0];

        if (currentBalance.compareTo(request.getAmount()) < 0) {
            throw new TransactionException(
                String.format("Insufficient funds. Available balance: %.2f, Requested: %.2f",
                    currentBalance, request.getAmount()),
                HttpStatus.BAD_REQUEST
            );
        }

        BigDecimal newBalance = currentBalance.subtract(request.getAmount());
        updateAccountBalance(request.getAccountId(), newBalance);

        Transaction transaction = Transaction.builder()
            .accountId(request.getAccountId())
            .userId(userId)
            .type(TransactionType.WITHDRAWAL)
            .amount(request.getAmount())
            .balanceBefore(currentBalance)
            .balanceAfter(newBalance)
            .description(request.getDescription() != null ? request.getDescription() : "Withdrawal")
            .build();

        transaction = transactionRepository.save(transaction);
        log.info("Withdrawal completed: transactionId={}", transaction.getId());
        return TransactionResponse.from(transaction);
    }

    // ── TRANSFER ─────────────────────────────────────────────────
    @Transactional
    public List<TransactionResponse> transfer(UUID userId, TransferRequest request) {
        log.info("Transfer request: userId={}, from={}, to={}, amount={}",
            userId, request.getFromAccountId(), request.getToAccountId(), request.getAmount());

        if (request.getFromAccountId().equals(request.getToAccountId())) {
            throw new TransactionException(
                "Cannot transfer to the same account.", HttpStatus.BAD_REQUEST
            );
        }

        BigDecimal[] fromBalance = getBalanceAndVerifyOwnership(request.getFromAccountId(), userId);
        BigDecimal currentFromBalance = fromBalance[0];

        if (currentFromBalance.compareTo(request.getAmount()) < 0) {
            throw new TransactionException(
                String.format("Insufficient funds. Available: %.2f, Requested: %.2f",
                    currentFromBalance, request.getAmount()),
                HttpStatus.BAD_REQUEST
            );
        }

        BigDecimal currentToBalance = getBalance(request.getToAccountId());
        BigDecimal newFromBalance = currentFromBalance.subtract(request.getAmount());
        BigDecimal newToBalance = currentToBalance.add(request.getAmount());

        updateAccountBalance(request.getFromAccountId(), newFromBalance);
        updateAccountBalance(request.getToAccountId(), newToBalance);

        UUID referenceId = UUID.randomUUID();
        String desc = request.getDescription() != null ? request.getDescription() : "Transfer";

        Transaction debit = Transaction.builder()
            .accountId(request.getFromAccountId())
            .userId(userId)
            .type(TransactionType.TRANSFER_DEBIT)
            .amount(request.getAmount())
            .balanceBefore(currentFromBalance)
            .balanceAfter(newFromBalance)
            .referenceId(referenceId)
            .relatedAccountId(request.getToAccountId())
            .description(desc)
            .build();

        Transaction credit = Transaction.builder()
            .accountId(request.getToAccountId())
            .userId(userId)
            .type(TransactionType.TRANSFER_CREDIT)
            .amount(request.getAmount())
            .balanceBefore(currentToBalance)
            .balanceAfter(newToBalance)
            .referenceId(referenceId)
            .relatedAccountId(request.getFromAccountId())
            .description(desc)
            .build();

        transactionRepository.save(debit);
        transactionRepository.save(credit);

        log.info("Transfer completed: referenceId={}", referenceId);
        return List.of(
            TransactionResponse.from(debit),
            TransactionResponse.from(credit)
        );
    }

    // ── HISTORY ──────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<TransactionResponse> getHistory(UUID accountId, UUID userId, int page, int size) {
        Page<Transaction> transactions = transactionRepository
            .findByAccountIdAndUserIdOrderByCreatedAtDesc(
                accountId, userId, PageRequest.of(page, size)
            );
        return transactions.stream()
            .map(TransactionResponse::from)
            .collect(Collectors.toList());
    }

    // ── HELPER METHODS ───────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private BigDecimal[] getBalanceAndVerifyOwnership(UUID accountId, UUID userId) {
        List<Object[]> result = entityManager.createNativeQuery(
            "SELECT balance, currency FROM accounts WHERE id = :id AND user_id = :userId AND status = 'active'"
        )
        .setParameter("id", accountId)
        .setParameter("userId", userId)
        .getResultList();

        if (result.isEmpty()) {
            throw new TransactionException(
                "Account not found, inactive, or does not belong to you.",
                HttpStatus.NOT_FOUND
            );
        }

        Object[] row = result.get(0);
        Object val = row[0];
        if (val instanceof BigDecimal) {
            return new BigDecimal[]{ (BigDecimal) val };
        }
        return new BigDecimal[]{ new BigDecimal(val.toString()) };
    }

    private BigDecimal getBalance(UUID accountId) {
        List<?> result = entityManager.createNativeQuery(
            "SELECT balance FROM accounts WHERE id = :id AND status = 'active'"
        )
        .setParameter("id", accountId)
        .getResultList();

        if (result.isEmpty()) {
            throw new TransactionException(
                "Destination account not found or inactive.",
                HttpStatus.NOT_FOUND
            );
        }

        Object val = result.get(0);
        if (val instanceof BigDecimal) {
            return (BigDecimal) val;
        }
        return new BigDecimal(val.toString());
    }

    private void updateAccountBalance(UUID accountId, BigDecimal newBalance) {
        entityManager.createNativeQuery(
            "UPDATE accounts SET balance = :balance, updated_at = NOW() WHERE id = :id"
        )
        .setParameter("balance", newBalance)
        .setParameter("id", accountId)
        .executeUpdate();
    }
}
