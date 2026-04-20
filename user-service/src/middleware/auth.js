// src/middleware/auth.js
//
// Middleware = a function that runs BETWEEN the request arriving
// and your actual code running. Think of it as a security guard
// at the door - every request must show their badge (JWT token)
// before being allowed in.
//
// How JWT works:
//   1. User logs in → we give them a signed token (like a signed ID card)
//   2. User sends that token with every future request
//   3. We verify the signature — if it matches, we trust the data inside
//   4. We attach the user info to the request so controllers can use it

const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  // JWT tokens are sent in the Authorization header like:
  // Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Get the part after "Bearer "

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
    });
  }

  try {
    // jwt.verify() does two things:
    // 1. Checks the signature (was this token really made by us?)
    // 2. Decodes the payload (extracts userId, email, role)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the decoded user info to the request object
    // Now any route handler can access req.user.userId etc.
    req.user = decoded;

    // Call next() to pass control to the actual route handler
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please log in again.',
      });
    }
    return res.status(403).json({
      success: false,
      message: 'Invalid token.',
    });
  }
};

// Optional middleware for admin-only routes
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required.',
    });
  }
};

module.exports = { authenticateToken, requireAdmin };
