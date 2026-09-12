package com.vjcloudbank.transaction.service;

// ─────────────────────────────────────────────────────────────────
// TransactionServiceTest.java
//
// Unit tests for transaction business logic.
// Mockito mocks TransactionRepository and EntityManager so tests
// never hit a real database.
//
// @MockitoSettings(strictness = LENIENT) is used because the shared
// helper mockBalanceQuery() stubs both getResultList() and
// executeUpdate(). Some test paths throw an exception before
// executeUpdate() gets called — under STRICT mode Mockito would
// report those as "unnecessary stubbings" and fail the test.
// LENIENT allows helper methods to over-stub without penalty.
// ─────────────────────────────────────────────────────────────────

import com.vjcloudbank.transaction.dto.TransactionDto.DepositRequest;
import com.vjcloudbank.transaction.dto.TransactionDto.TransactionResponse;
import com.vjcloudbank.transaction.dto.TransactionDto.TransferRequest;
import com.vjcloudbank.transaction.dto.TransactionDto.WithdrawalRequest;
import com.vjcloudbank.transaction.exception.GlobalExceptionHandler.TransactionException;
import com.vjcloudbank.transaction.model.Transaction;
import com.vjcloudbank.transaction.model.Transaction.TransactionType;
import com.vjcloudbank.transaction.repository.TransactionRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("TransactionService unit tests")
class TransactionServiceTest {

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private EntityManager entityManager;

    @Mock
    private Query nativeQuery;

    @InjectMocks
    private TransactionService transactionService;

    private UUID userId;
    private UUID accountId;
    private UUID otherAccountId;

    @BeforeEach
    void setUp() {
        // EntityManager is a @PersistenceContext field, not constructor-injected.
        ReflectionTestUtils.setField(transactionService, "entityManager", entityManager);

        userId = UUID.randomUUID();
        accountId = UUID.randomUUID();
        otherAccountId = UUID.randomUUID();
    }

    /**
     * Build a mock return list containing ONE row of [balance, currency].
     * Uses ArrayList.add() to avoid varargs issues with List.of(Object[]).
     */
    private List<Object[]> singleBalanceRow(BigDecimal balance) {
        List<Object[]> rows = new ArrayList<>();
        rows.add(new Object[]{ balance, "INR" });
        return rows;
    }

    private void mockBalanceQuery(BigDecimal balance) {
        when(entityManager.createNativeQuery(anyString())).thenReturn(nativeQuery);
        when(nativeQuery.setParameter(anyString(), any())).thenReturn(nativeQuery);
        when(nativeQuery.getResultList()).thenReturn(singleBalanceRow(balance));
        when(nativeQuery.executeUpdate()).thenReturn(1);
    }

    private void mockAccountNotFound() {
        when(entityManager.createNativeQuery(anyString())).thenReturn(nativeQuery);
        when(nativeQuery.setParameter(anyString(), any())).thenReturn(nativeQuery);
        when(nativeQuery.getResultList()).thenReturn(Collections.emptyList());
    }

    // ═══════════════════════════════════════════════════════════
    // DEPOSIT
    // ═══════════════════════════════════════════════════════════
    @Test
    @DisplayName("Deposit: succeeds and increases balance")
    void deposit_succeedsWithValidAmount() {
        BigDecimal currentBalance = new BigDecimal("1000.00");
        BigDecimal depositAmount = new BigDecimal("500.00");

        DepositRequest request = new DepositRequest();
        request.setAccountId(accountId);
        request.setAmount(depositAmount);
        request.setDescription("Test deposit");

        mockBalanceQuery(currentBalance);

        Transaction savedTx = Transaction.builder()
            .id(UUID.randomUUID())
            .accountId(accountId)
            .userId(userId)
            .type(TransactionType.DEPOSIT)
            .amount(depositAmount)
            .balanceBefore(currentBalance)
            .balanceAfter(currentBalance.add(depositAmount))
            .description("Test deposit")
            .status(Transaction.TransactionStatus.COMPLETED)
            .build();
        when(transactionRepository.save(any(Transaction.class))).thenReturn(savedTx);

        TransactionResponse response = transactionService.deposit(userId, request);

        assertThat(response).isNotNull();
        assertThat(response.getAmount()).isEqualByComparingTo(depositAmount);
        assertThat(response.getBalanceBefore()).isEqualByComparingTo(currentBalance);
        assertThat(response.getBalanceAfter()).isEqualByComparingTo(new BigDecimal("1500.00"));
        assertThat(response.getType()).isEqualTo("DEPOSIT");

        verify(transactionRepository, times(1)).save(any(Transaction.class));
    }

    // ═══════════════════════════════════════════════════════════
    // WITHDRAW
    // ═══════════════════════════════════════════════════════════
    @Test
    @DisplayName("Withdraw: succeeds when balance is sufficient")
    void withdraw_succeedsWithSufficientBalance() {
        BigDecimal currentBalance = new BigDecimal("1000.00");
        BigDecimal withdrawAmount = new BigDecimal("300.00");

        WithdrawalRequest request = new WithdrawalRequest();
        request.setAccountId(accountId);
        request.setAmount(withdrawAmount);
        request.setDescription("ATM withdrawal");

        mockBalanceQuery(currentBalance);

        Transaction savedTx = Transaction.builder()
            .id(UUID.randomUUID())
            .accountId(accountId)
            .userId(userId)
            .type(TransactionType.WITHDRAWAL)
            .amount(withdrawAmount)
            .balanceBefore(currentBalance)
            .balanceAfter(currentBalance.subtract(withdrawAmount))
            .description("ATM withdrawal")
            .status(Transaction.TransactionStatus.COMPLETED)
            .build();
        when(transactionRepository.save(any(Transaction.class))).thenReturn(savedTx);

        TransactionResponse response = transactionService.withdraw(userId, request);

        assertThat(response.getBalanceAfter()).isEqualByComparingTo(new BigDecimal("700.00"));
        assertThat(response.getType()).isEqualTo("WITHDRAWAL");
    }

    @Test
    @DisplayName("Withdraw: fails when balance is insufficient")
    void withdraw_failsWithInsufficientBalance() {
        BigDecimal currentBalance = new BigDecimal("100.00");
        BigDecimal withdrawAmount = new BigDecimal("500.00");

        WithdrawalRequest request = new WithdrawalRequest();
        request.setAccountId(accountId);
        request.setAmount(withdrawAmount);

        mockBalanceQuery(currentBalance);

        assertThatThrownBy(() -> transactionService.withdraw(userId, request))
            .isInstanceOf(TransactionException.class)
            .hasMessageContaining("Insufficient funds");

        verify(transactionRepository, times(0)).save(any(Transaction.class));
    }

    @Test
    @DisplayName("Withdraw: fails when account is not found or not owned by user")
    void withdraw_failsWhenAccountNotFound() {
        WithdrawalRequest request = new WithdrawalRequest();
        request.setAccountId(accountId);
        request.setAmount(new BigDecimal("100.00"));

        mockAccountNotFound();

        assertThatThrownBy(() -> transactionService.withdraw(userId, request))
            .isInstanceOf(TransactionException.class)
            .hasMessageContaining("not found");
    }

    // ═══════════════════════════════════════════════════════════
    // TRANSFER
    // ═══════════════════════════════════════════════════════════
    @Test
    @DisplayName("Transfer: fails when source == destination")
    void transfer_failsWhenSameAccount() {
        TransferRequest request = new TransferRequest();
        request.setFromAccountId(accountId);
        request.setToAccountId(accountId);
        request.setAmount(new BigDecimal("100.00"));

        assertThatThrownBy(() -> transactionService.transfer(userId, request))
            .isInstanceOf(TransactionException.class)
            .hasMessageContaining("same account");

        verify(transactionRepository, times(0)).save(any(Transaction.class));
    }

    @Test
    @DisplayName("Transfer: fails when source has insufficient balance")
    void transfer_failsWithInsufficientBalance() {
        TransferRequest request = new TransferRequest();
        request.setFromAccountId(accountId);
        request.setToAccountId(otherAccountId);
        request.setAmount(new BigDecimal("5000.00"));

        mockBalanceQuery(new BigDecimal("100.00"));

        assertThatThrownBy(() -> transactionService.transfer(userId, request))
            .isInstanceOf(TransactionException.class)
            .hasMessageContaining("Insufficient funds");
    }
}
