# VjCloudBank — API Gateway

Single entry point for all VjCloudBank microservices. Handles auth, rate limiting, logging and routing.

## What it does

Every request from the frontend hits port 3000 first. The gateway:
1. Applies rate limiting (100 req/min general, 10 req/15min for auth)
2. Verifies JWT token (skips for login/register)
3. Attaches user info as headers (x-user-id, x-user-email)
4. Proxies to the correct downstream service
5. Returns the response transparently

## Route Mapping

| URL Pattern | Proxied To | Auth Required |
|---|---|---|
| `/api/users/register` | User Service :3001 | No |
| `/api/users/login` | User Service :3001 | No |
| `/api/users/*` | User Service :3001 | Yes |
| `/api/accounts/*` | Account Service :3002 | Yes |
| `/api/transactions/*` | Transaction Service :3003 | Yes |
| `/api/notifications/*` | Notification Service :3004 | Yes |

## Running Locally

```bash
# 1. Install
npm install

# 2. Setup env
cp .env.example .env

# 3. Start all services first (in separate terminals)
# User Service:         cd user-service && npm run dev
# Account Service:      cd account-service && python -m app.main
# Transaction Service:  cd transaction-service && mvn spring-boot:run
# Notification Service: cd notification-service && npm run dev

# 4. Start gateway
npm run dev
```

Gateway runs on **http://localhost:3000**

## Testing via Gateway

Once running, use port 3000 for ALL requests instead of individual ports:

```bash
# Register (was localhost:3001, now through gateway)
POST http://localhost:3000/api/users/register

# Login
POST http://localhost:3000/api/users/login

# All protected routes need Authorization header
GET  http://localhost:3000/api/accounts
POST http://localhost:3000/api/transactions/deposit
```

## Key Interview Talking Points

- **Edge authentication** — JWT verified once at gateway, not in every service
- **Rate limiting** — two tiers: general (100/min) and auth (10/15min brute force protection)
- **Helmet** — security headers added automatically (XSS, clickjacking protection)
- **Service discovery** — URLs from env vars, Kubernetes DNS in production
- **LoadBalancer vs ClusterIP** — gateway is the only internet-facing service
- **x-gateway header** — downstream services can verify request came through gateway
