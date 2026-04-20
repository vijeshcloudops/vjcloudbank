// src/app.js
//
// This is the ENTRY POINT of our service.
// It wires everything together:
//   - Creates the Express app
//   - Adds global middleware (cors, json parsing)
//   - Mounts the routes
//   - Connects to the database
//   - Starts listening for requests

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { initializeDatabase } = require('./config/db');
const userRoutes = require('./routes/userRoutes');

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── Global Middleware ────────────────────────────────────────────────

// CORS = Cross-Origin Resource Sharing
// Allows our React frontend (running on a different port/domain)
// to call this API. Without this, browsers block the request.
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parse incoming JSON request bodies
// Without this, req.body would be undefined
app.use(express.json());

// Parse URL-encoded bodies (form submissions)
app.use(express.urlencoded({ extended: true }));

// ─── Request Logger ───────────────────────────────────────────────────
// Simple middleware to log every incoming request.
// In production we'd use a proper logger like winston or morgan.
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────
// All user routes are prefixed with /api/users
// So POST /register becomes POST /api/users/register
app.use('/api/users', userRoutes);

// Root endpoint — useful for confirming the service is up
app.get('/', (req, res) => {
  res.json({
    service: 'VjCloudBank User Service',
    version: '1.0.0',
    status:  'running',
  });
});

// ─── 404 Handler ─────────────────────────────────────────────────────
// If no route matched, return a clean 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────
// Express catches unhandled errors here (must have 4 parameters)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

// ─── Start Server ─────────────────────────────────────────────────────
const startServer = async () => {
  // Initialize DB first, then start listening
  await initializeDatabase();

  app.listen(PORT, () => {
    console.log(`\n🚀 User Service running on port ${PORT}`);
    console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Health check: http://localhost:${PORT}/health`);
    console.log(`   Register    : POST http://localhost:${PORT}/api/users/register`);
    console.log(`   Login       : POST http://localhost:${PORT}/api/users/login`);
    console.log(`   Profile     : GET  http://localhost:${PORT}/api/users/profile\n`);
  });
};

startServer();

module.exports = app; // exported for testing
