# VjCloudBank — User Service

Handles user registration, login, and JWT-based authentication for the VjCloudBank platform.

## API Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/health` | No | Health check for Kubernetes |
| POST | `/api/users/register` | No | Create a new account |
| POST | `/api/users/login` | No | Login and receive JWT token |
| GET | `/api/users/profile` | Yes (JWT) | Get current user's details |

## Running Locally

### Prerequisites
- Node.js 20+
- PostgreSQL 14+ running locally

### Steps

```bash
# 1. Clone and enter the directory
cd user-service

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# 4. Start the service
npm run dev
```

The service starts on **http://localhost:3001**

## Testing the API

### Register a new user
```bash
curl -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Raj Kumar",
    "email": "raj@example.com",
    "password": "SecurePass1"
  }'
```

### Login
```bash
curl -X POST http://localhost:3001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "raj@example.com",
    "password": "SecurePass1"
  }'
```

### Get Profile (use token from login response)
```bash
curl http://localhost:3001/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

## Building the Docker Image

```bash
# Build the image
docker build -t user-service:latest .

# Run it locally with Docker
docker run -p 3001:3001 \
  -e DB_HOST=host.docker.internal \
  -e DB_NAME=vjcloudbank_users \
  -e DB_USER=postgres \
  -e DB_PASSWORD=yourpassword \
  -e JWT_SECRET=yoursecret \
  user-service:latest
```

## Deploying to AWS

```bash
# 1. Authenticate Docker with ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# 2. Tag the image for ECR
docker tag user-service:latest \
  YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/user-service:latest

# 3. Push to ECR
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/user-service:latest

# 4. Deploy to EKS
kubectl apply -f k8s/user-service-deployment.yaml
```

## Project Structure

```
user-service/
├── src/
│   ├── config/
│   │   └── db.js              # PostgreSQL connection pool + table init
│   ├── middleware/
│   │   └── auth.js            # JWT verification middleware
│   ├── routes/
│   │   └── userRoutes.js      # API endpoint definitions + validation
│   ├── controllers/
│   │   └── userController.js  # Business logic (register, login, profile)
│   └── app.js                 # Express app setup + server start
├── k8s/
│   └── user-service-deployment.yaml  # Kubernetes Deployment + Service
├── Dockerfile                 # Container build instructions
├── .env.example               # Environment variable template
└── package.json               # Dependencies
```

## Security Highlights (Good for Interviews!)

- Passwords are hashed with **bcrypt** (10 salt rounds) — never stored in plain text
- JWTs are signed with **HS256** and expire after 7 days
- Generic error messages on login failure to prevent **user enumeration**
- Container runs as a **non-root user** for security
- Sensitive config loaded from **environment variables** (AWS Secrets Manager in production)
- Input validation on all endpoints using **express-validator**
