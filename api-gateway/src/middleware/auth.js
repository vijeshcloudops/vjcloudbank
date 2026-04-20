// src/middleware/auth.js
//
// The API Gateway is the ONLY place JWT verification happens.
// Once a request passes the gateway, downstream services
// trust the x-user-id and x-user-email headers we attach.
//
// This pattern is called "Edge Authentication" — verify once
// at the boundary, trust internally. Much more efficient than
// every service verifying the token independently.

const jwt = require('jsonwebtoken');
const { isPublicRoute } = require('../config/services');
require('dotenv').config();

const authenticateRequest = (req, res, next) => {
  // Skip JWT check for public routes (login, register)
  if (isPublicRoute(req.path, req.method)) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
      path: req.path,
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info as headers so downstream services
    // don't need to re-verify the token themselves
    req.headers['x-user-id']    = decoded.userId;
    req.headers['x-user-email'] = decoded.email;
    req.headers['x-user-role']  = decoded.role;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please log in again.',
      });
    }
    return res.status(403).json({
      success: false,
      message: 'Invalid token.',
    });
  }
};

module.exports = { authenticateRequest };
