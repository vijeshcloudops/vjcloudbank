# VjCloudBank — Transaction Service

Handles deposits, withdrawals and transfers. Built with Java 17 + Spring Boot 3.

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/transactions/health` | No | Health check |
| POST | `/api/transactions/deposit` | JWT | Deposit money |
| POST | `/api/transactions/withdraw` | JWT | Withdraw money |
| POST | `/api/transactions/transfer` | JWT | Transfer between accounts |
| GET | `/api/transactions/history/{accountId}` | JWT | Transaction history |

## Prerequisites

- Java 17+ — download from `adoptium.net`
- Maven 3.9+ — download from `maven.apache.org`
- PostgreSQL running
- User Service running (port 3001) — to get JWT tokens
- Account Service running (port 3002) — accounts must exist

## Running Locally

```bash
# 1. Create the database
psql -U postgres -c "CREATE DATABASE vjcloudbank_transactions;"

# 2. Set environment variables (Windows Git Bash)
export DB_PASSWORD=your_postgres_password
export JWT_SECRET=your_jwt_secret_same_as_other_services

# 3. Build and run
mvn spring-boot:run
```

Service starts on **http://localhost:3003**

## Testing with Postman

### Step 1 — Login to get JWT token
```
POST http://localhost:3001/api/users/login
Body: { "email": "raj@example.com", "password": "TestPass1" }
```

### Step 2 — Get your account ID
```
GET http://localhost:3002/api/accounts
Authorization: Bearer YOUR_TOKEN
```
Copy the `id` from the response.

### Step 3 — Deposit
```
POST http://localhost:3003/api/transactions/deposit
Authorization: Bearer YOUR_TOKEN
Body:
{
  "accountId": "YOUR_ACCOUNT_ID",
  "amount": 5000.00,
  "description": "Initial deposit"
}
```

### Step 4 — Withdraw
```
POST http://localhost:3003/api/transactions/withdraw
Authorization: Bearer YOUR_TOKEN
Body:
{
  "accountId": "YOUR_ACCOUNT_ID",
  "amount": 500.00,
  "description": "ATM withdrawal"
}
```

### Step 5 — Transfer (need two accounts)
```
POST http://localhost:3003/api/transactions/transfer
Authorization: Bearer YOUR_TOKEN
Body:
{
  "fromAccountId": "SOURCE_ACCOUNT_ID",
  "toAccountId": "DEST_ACCOUNT_ID",
  "amount": 1000.00,
  "description": "Rent payment"
}
```

### Step 6 — View history
```
GET http://localhost:3003/api/transactions/history/YOUR_ACCOUNT_ID
Authorization: Bearer YOUR_TOKEN
```

## Key Interview Talking Points

- **@Transactional** — atomic operations, automatic rollback on failure
- **Two transaction records per transfer** — debit + credit linked by `reference_id`
- **balance_before / balance_after** — full audit trail, immutable history
- **BigDecimal for money** — never use float/double for currency in Java
- **JPA Repository** — Spring auto-generates SQL from method names
- **Global exception handler** — centralised error handling with @RestControllerAdvice
