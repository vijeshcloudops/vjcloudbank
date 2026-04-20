# VjCloudBank — Notification Service

Sends email and SMS notifications for all banking events. Built with Node.js + AWS SES + AWS SNS.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications/health` | Health check |
| POST | `/api/notifications/welcome` | Welcome email on registration |
| POST | `/api/notifications/transaction` | Transaction alert |
| POST | `/api/notifications/account-opened` | Account opened alert |
| POST | `/api/notifications/low-balance` | Low balance warning |

## Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Set USE_MOCK_NOTIFICATIONS=true for local (no AWS needed)
# Set JWT_SECRET same as other services

# 3. Start
npm run dev
```

Service runs on **http://localhost:3004**

## Local Testing (Mock Mode)

With `USE_MOCK_NOTIFICATIONS=true`, no real AWS account is needed.
Notifications are printed to the terminal instead.

Test welcome notification:
```bash
curl -X POST http://localhost:3004/api/notifications/welcome \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Raj Kumar",
    "email": "raj@example.com",
    "phoneNumber": "+919876543210"
  }'
```

Test transaction alert:
```bash
curl -X POST http://localhost:3004/api/notifications/transaction \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Raj Kumar",
    "email": "raj@example.com",
    "phoneNumber": "+919876543210",
    "type": "DEPOSIT",
    "amount": "5000.00",
    "currency": "INR",
    "balanceAfter": "15000.00",
    "accountNumber": "5098180134",
    "description": "Salary deposit"
  }'
```

## Production AWS Setup

### SES (Email) Setup
1. Go to AWS Console → SES
2. Verify your sender domain or email
3. Request production access (removes sandbox restrictions)
4. Set `SES_FROM_EMAIL` in secrets

### SNS (SMS) Setup
1. Go to AWS Console → SNS → Text messaging
2. Set SMS type to "Transactional"
3. No extra setup needed — SNS sends directly to phone numbers

### IAM Permissions needed
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ses:SendEmail", "ses:SendRawEmail"],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["sns:Publish"],
      "Resource": "*"
    }
  ]
}
```

## Key Interview Talking Points

- **Mock mode** — service works locally without AWS credentials
- **Non-blocking design** — notification failures never break transactions
- **AWS SES vs SNS** — SES for email, SNS for SMS (distinct services, distinct use cases)
- **IAM roles on EKS** — no hardcoded AWS keys in production (IRSA pattern)
- **Transactional SMS type** — higher priority than promotional, important for banking alerts
- **Event-driven** — other services call this service after completing their operations
