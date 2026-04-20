// src/routes/proxyRoutes.js
//
// This is the HEART of the API Gateway — the proxy router.
// express-http-proxy forwards the request to the correct
// downstream service and returns the response transparently.
//
// The client thinks it's talking to one server (port 3000).
// In reality, requests are being forwarded to 4 different services.
//
// URL rewriting:
//   Client sends:    GET /api/users/profile
//   Gateway proxies: GET /api/users/profile → localhost:3001
//   (URL stays the same — each service handles its own prefix)

const express = require('express');
const proxy = require('express-http-proxy');
const { services } = require('../config/services');
const { authLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

// ── Helper: create a proxy with error handling ────────────────────
const createProxy = (serviceConfig) => {
  return proxy(serviceConfig.url, {
    // Forward the original request path unchanged
    proxyReqPathResolver: (req) => req.originalUrl,

    // Forward user headers set by auth middleware
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers['x-user-id']      = srcReq.headers['x-user-id'] || '';
      proxyReqOpts.headers['x-user-email']   = srcReq.headers['x-user-email'] || '';
      proxyReqOpts.headers['x-user-role']    = srcReq.headers['x-user-role'] || '';
      proxyReqOpts.headers['x-gateway']      = 'vjcloudbank-api-gateway';
      return proxyReqOpts;
    },

    // Handle errors when downstream service is unreachable
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      return proxyResData;
    },

    proxyErrorHandler: (err, res, next) => {
      console.error(`❌ Proxy error to ${serviceConfig.name}:`, err.message);
      res.status(503).json({
        success: false,
        message: `${serviceConfig.name} is temporarily unavailable. Please try again.`,
        service: serviceConfig.name,
      });
    },
  });
};

// ── Auth routes (stricter rate limiting on login/register) ────────
router.use(
  '/api/users/login',
  authLimiter,
  createProxy(services.user)
);
router.use(
  '/api/users/register',
  authLimiter,
  createProxy(services.user)
);
// All other user routes
router.use('/api/users', createProxy(services.user));

// ── Account routes ────────────────────────────────────────────────
router.use('/api/accounts', createProxy(services.account));

// ── Transaction routes ────────────────────────────────────────────
router.use('/api/transactions', createProxy(services.transaction));

// ── Notification routes (internal) ───────────────────────────────
router.use('/api/notifications', createProxy(services.notification));

module.exports = router;
