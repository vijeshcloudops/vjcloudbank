// src/middleware/rateLimiter.js
//
// Rate limiting prevents abuse — stops someone from
// hammering the API with thousands of requests.
//
// For a banking app this is critical:
//   - Prevents brute force login attacks
//   - Stops DDoS attempts
//   - Protects downstream services from overload
//
// express-rate-limit tracks requests per IP address.
// After 100 requests in 1 minute, the IP gets blocked
// until the window resets.

const rateLimit = require('express-rate-limit');
require('dotenv').config();

// General rate limiter — applies to all routes
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true, // Returns rate limit info in headers
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again in a minute.',
  },
  // Skip rate limiting for health checks
  skip: (req) => req.path === '/health',
});

// Stricter limiter for auth endpoints — prevents brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Only 10 login attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.',
  },
});

module.exports = { generalLimiter, authLimiter };
