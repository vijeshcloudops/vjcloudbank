# VjCloudBank — React Frontend

Banking dashboard built with React + Vite. Connects to the API Gateway.

## Pages

| Page | Route | Description |
|---|---|---|
| Login | `/login` | Email + password login |
| Register | `/register` | Create new account |
| Dashboard | `/dashboard` | Balance overview + recent transactions |
| Accounts | `/accounts` | View accounts, deposit, withdraw, open new |
| Transfer | `/transfer` | Transfer money between accounts |
| History | `/history` | Full paginated transaction history |

## Running Locally

```bash
# Prerequisites: API Gateway must be running on port 3000

# 1. Install
npm install

# 2. Start
npm run dev
```

Open **http://localhost:5173**

Vite proxies all `/api/*` requests to `http://localhost:3000` automatically — no CORS issues.

## Build for Production (S3 + CloudFront)

```bash
# Build static files
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-vjcloudbank-bucket --delete

# CloudFront invalidation
aws cloudfront create-invalidation \
  --distribution-id YOUR_CF_DISTRIBUTION_ID \
  --paths "/*"
```

## Tech Stack

- React 18 — UI framework
- React Router v6 — client-side routing
- Axios — HTTP client with interceptors
- Vite — build tool and dev server
