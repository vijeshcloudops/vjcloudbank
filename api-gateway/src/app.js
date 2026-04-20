// src/app.js
//
// The API Gateway wires together:
//   1. Security headers (helmet)
//   2. CORS
//   3. Rate limiting
//   4. JWT authentication
//   5. Request logging
//   6. Proxy routing to downstream services

require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const { generalLimiter }     = require('./middleware/rateLimiter');
const { authenticateRequest } = require('./middleware/auth');
const { requestLogger, logger } = require('./middleware/logger');
const proxyRoutes = require('./routes/proxyRoutes');
const { services } = require('./config/services');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Security headers ──────────────────────────────────────────────
// helmet adds important HTTP security headers:
// X-Content-Type-Options, X-Frame-Options, etc.
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body parsing ──────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting ─────────────────────────────────────────────────
app.use(generalLimiter);

// ── Request logging ───────────────────────────────────────────────
app.use(requestLogger);

// ── JWT Authentication ────────────────────────────────────────────
app.use(authenticateRequest);

// ── Health check ──────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success:   true,
    service:   'api-gateway',
    status:    'healthy',
    timestamp: new Date().toISOString(),
    downstream: {
      userService:         services.user.url,
      accountService:      services.account.url,
      transactionService:  services.transaction.url,
      notificationService: services.notification.url,
    },
  });
});

// Root
app.get('/', (req, res) => {
  res.json({
    service: 'VjCloudBank API Gateway',
    version: '1.0.0',
    status:  'running',
    routes: [
      '/api/users/*        → User Service      :3001',
      '/api/accounts/*     → Account Service   :3002',
      '/api/transactions/* → Transaction Svc   :3003',
      '/api/notifications/*→ Notification Svc  :3004',
    ],
  });
});

// ── Proxy routes ──────────────────────────────────────────────────
app.use('/', proxyRoutes);

// ── 404 handler ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found in gateway`,
  });
});

// ── Global error handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error('Gateway error', { error: err.message, path: req.path });
  res.status(500).json({
    success: false,
    message: 'Internal gateway error',
  });
});

// ── Start ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🌐 API Gateway running on port ${PORT}`);
  console.log(`   /api/users/*         → ${services.user.url}`);
  console.log(`   /api/accounts/*      → ${services.account.url}`);
  console.log(`   /api/transactions/*  → ${services.transaction.url}`);
  console.log(`   /api/notifications/* → ${services.notification.url}`);
  console.log(`\n   Health: http://localhost:${PORT}/health\n`);
});

module.exports = app;
