// src/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const PORT = process.env.PORT || 3004;

// ── Middleware ────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/notifications', notificationRoutes);

// Root
app.get('/', (req, res) => {
  res.json({
    service: 'VjCloudBank Notification Service',
    version: '1.0.0',
    status: 'running',
    mode: process.env.USE_MOCK_NOTIFICATIONS === 'true' ? 'mock' : 'live (AWS)',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  const mode = process.env.USE_MOCK_NOTIFICATIONS === 'true'
    ? '🔧 MOCK MODE (no real AWS calls)'
    : '🚀 LIVE MODE (AWS SES + SNS)';

  console.log(`\n🔔 Notification Service running on port ${PORT}`);
  console.log(`   Mode        : ${mode}`);
  console.log(`   Health check: http://localhost:${PORT}/api/notifications/health\n`);
});

module.exports = app;
