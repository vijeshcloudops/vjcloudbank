package com.vjcloudbank.transaction.model;

// ─────────────────────────────────────────────────────────────────
// Transaction.java — The database entity (table row as a Java object)
//
// @Entity  = this class maps to a database table
// @Table   = specifies the table name
// @Column  = specifies the column name and constraints
//
// Lombok annotations (@Data, @Builder etc.) auto-generate:
//   - getters and setters for every field
//   - toString(), equals(), hashCode()
//   - builder pattern for creating objects
// This saves hundreds of lines of boilerplate Java code!
// ─────────────────────────────────────────────────────────────────

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.GenericGenerator;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "transactions", indexes = {
    @Index(name = "idx_transactions_account_id", columnList = "account_id"),
    @Index(name = "idx_transactions_reference_id", columnList = "reference_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Transaction {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(updatable = false, nullable = false)
    private UUID id;

    // The account this transaction belongs to
    @Column(name = "account_id", nullable = false)
    private UUID accountId;

    // The user who owns this account (for quick ownership checks)
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    // Type of transaction
    // DEPOSIT          = money coming in
    // WITHDRAWAL       = money going out
    // TRANSFER_DEBIT   = money leaving in a transfer (sender's side)
    // TRANSFER_CREDIT  = money arriving in a transfer (receiver's side)
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private TransactionType type;

    // The amount involved — always positive
    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    // Snapshot of balance BEFORE this transaction
    // Critical for audit trail and dispute resolution
    @Column(name = "balance_before", nullable = false, precision = 15, scale = 2)
    private BigDecimal balanceBefore;

    // Snapshot of balance AFTER this transaction
    @Column(name = "balance_after", nullable = false, precision = 15, scale = 2)
    private BigDecimal balanceAfter;

    // For transfers: links the DEBIT and CREDIT transactions together
    // Both sides of a transfer share the same reference_id
    @Column(name = "reference_id")
    private UUID referenceId;

    // For transfers: the OTHER account involved
    @Column(name = "related_account_id")
    private UUID relatedAccountId;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "currency", length = 10)
    @Builder.Default
    private String currency = "INR";

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private TransactionStatus status = TransactionStatus.COMPLETED;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // Enum types defined as inner classes for simplicity
    public enum TransactionType {
        DEPOSIT, WITHDRAWAL, TRANSFER_DEBIT, TRANSFER_CREDIT
    }

    public enum TransactionStatus {
        PENDING, COMPLETED, FAILED
    }
}
