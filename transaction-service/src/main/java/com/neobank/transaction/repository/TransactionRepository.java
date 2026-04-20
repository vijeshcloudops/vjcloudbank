package com.vjcloudbank.transaction.repository;

// ─────────────────────────────────────────────────────────────────
// TransactionRepository.java
//
// Spring Data JPA gives us database operations FOR FREE just by
// extending JpaRepository. We don't write a single SQL query
// for basic operations — Spring generates them automatically!
//
// JpaRepository<Transaction, UUID> means:
//   - Entity type = Transaction
//   - Primary key type = UUID
//
// We get these for FREE:
//   save(), findById(), findAll(), delete(), count() etc.
//
// Custom queries use method naming conventions:
//   findByAccountId() → SELECT * FROM transactions WHERE account_id = ?
//   findByAccountIdAndType() → WHERE account_id = ? AND type = ?
// ─────────────────────────────────────────────────────────────────

import com.vjcloudbank.transaction.model.Transaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    // Get all transactions for an account, newest first, with pagination
    // Pageable allows: page number, page size, sort direction
    Page<Transaction> findByAccountIdOrderByCreatedAtDesc(UUID accountId, Pageable pageable);

    // Get transactions for an account owned by a specific user (security check)
    Page<Transaction> findByAccountIdAndUserIdOrderByCreatedAtDesc(
        UUID accountId, UUID userId, Pageable pageable
    );

    // Get all transactions linked by the same reference (debit + credit pair)
    List<Transaction> findByReferenceId(UUID referenceId);

    // Count transactions for an account (useful for stats)
    long countByAccountId(UUID accountId);

    // Custom JPQL query — get recent transactions with a limit
    @Query("SELECT t FROM Transaction t WHERE t.accountId = :accountId ORDER BY t.createdAt DESC")
    List<Transaction> findRecentByAccountId(UUID accountId, Pageable pageable);
}
