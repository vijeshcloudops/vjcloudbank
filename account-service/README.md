# VjCloudBank — Account Service

Manages bank accounts for the VjCloudBank platform. Built with Python + FastAPI.

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/accounts/health` | No | Health check |
| POST | `/api/accounts` | JWT | Open a new account |
| GET | `/api/accounts` | JWT | List my accounts |
| GET | `/api/accounts/{id}` | JWT | Get account details |
| GET | `/api/accounts/{id}/balance` | JWT | Get account balance |
| PATCH | `/api/accounts/{id}/close` | JWT | Close an account |

## Running Locally

### Prerequisites
- Python 3.12+
- PostgreSQL 14+
- User Service running (to get JWT tokens for testing)

### Steps

```bash
# 1. Enter the directory
cd account-service

# 2. Create a virtual environment (keeps dependencies isolated)
python -m venv venv

# Activate it:
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Create the database
psql -U postgres -c "CREATE DATABASE vjcloudbank_accounts;"

# 5. Set up environment variables
cp .env.example .env
# Edit .env — set DB_PASSWORD and JWT_SECRET
# JWT_SECRET MUST match the one in user-service .env

# 6. Start the service
python -m app.main
```

Service runs on **http://localhost:3002**

Swagger docs (auto-generated!): **http://localhost:3002/docs**

## Testing with Postman

### Step 1 — Get a JWT token from User Service
```
POST http://localhost:3001/api/users/login
Body: { "email": "raj@example.com", "password": "TestPass1" }
```
Copy the token from the response.

### Step 2 — Create an account
```
POST http://localhost:3002/api/accounts
Authorization: Bearer YOUR_TOKEN
Body:
{
  "account_type": "savings",
  "currency": "INR",
  "description": "My primary savings",
  "initial_deposit": 10000
}
```

### Step 3 — List all accounts
```
GET http://localhost:3002/api/accounts
Authorization: Bearer YOUR_TOKEN
```

### Step 4 — Get balance
```
GET http://localhost:3002/api/accounts/{account_id}/balance
Authorization: Bearer YOUR_TOKEN
```

## Project Structure

```
account-service/
├── app/
│   ├── config/
│   │   └── database.py          # asyncpg connection pool + table init
│   ├── middleware/
│   │   └── auth.py              # JWT verification (FastAPI Depends)
│   ├── routes/
│   │   └── account_routes.py   # API endpoints
│   ├── controllers/
│   │   └── account_controller.py # Business logic
│   ├── schemas/
│   │   └── account_schema.py   # Pydantic request/response models
│   └── main.py                 # FastAPI app + lifespan hooks
├── k8s/
│   └── account-service-deployment.yaml
├── Dockerfile
├── requirements.txt
└── .env.example
```

## Key Differences from User Service (Interview Talking Points)

- **Python + FastAPI** vs Node.js + Express — shows polyglot skills
- **asyncpg** for async DB queries — non-blocking, faster than sync drivers
- **Pydantic schemas** for automatic validation AND documentation
- **Auto-generated Swagger UI** at `/docs` — FastAPI does this for free
- **Ownership checks** on every query — `WHERE user_id = $user_id`
- **Soft deletes** — accounts are closed, never deleted (audit trail)
- **NUMERIC(15,2)** for money — never use FLOAT for currency!
