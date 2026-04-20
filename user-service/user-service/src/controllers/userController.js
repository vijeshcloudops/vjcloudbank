// src/controllers/userController.js
//
// Controllers contain the actual BUSINESS LOGIC.
// They receive a request, do the work, and send back a response.
// Think of the controller as the chef in a restaurant:
//   - Routes are the waiter (takes your order)
//   - Controller is the chef (actually makes the food)
//   - Database is the pantry (stores the ingredients)

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { pool } = require('../config/db');

// ─────────────────────────────────────────────
// REGISTER a new user
// POST /api/users/register
// ─────────────────────────────────────────────
const register = async (req, res) => {
  // Check if the incoming data passed our validation rules (defined in routes)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { full_name, email, password } = req.body;

  try {
    // Step 1: Check if email is already taken
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // Step 2: Hash the password
    // NEVER store plain text passwords!
    // bcrypt turns "mypassword123" into something like:
    // "$2b$10$X9pXmFGK4jzv..." which cannot be reversed
    // The "10" is the "salt rounds" - higher = more secure but slower
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Step 3: Save user to database
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, full_name, email, role, created_at`,
      [full_name, email.toLowerCase(), password_hash]
    );

    const newUser = result.rows[0];

    // Step 4: Return success (we don't return the password hash!)
    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: {
        id:         newUser.id,
        full_name:  newUser.full_name,
        email:      newUser.email,
        role:       newUser.role,
        created_at: newUser.created_at,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.',
    });
  }
};

// ─────────────────────────────────────────────
// LOGIN an existing user
// POST /api/users/login
// ─────────────────────────────────────────────
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { email, password } = req.body;

  try {
    // Step 1: Find the user by email
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      // Security tip: Don't say "email not found" - say generic message
      // so attackers can't enumerate which emails exist in our system
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const user = result.rows[0];

    // Step 2: Compare the entered password against the stored hash
    // bcrypt.compare() hashes the entered password the same way
    // and checks if it matches. Returns true or false.
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Step 3: Create a JWT token
    // The token contains a "payload" (data inside it) and is signed
    // with our secret key. Anyone can READ the payload, but only we
    // can CREATE a valid signature — so it can't be faked.
    const tokenPayload = {
      userId: user.id,
      email:  user.email,
      role:   user.role,
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    // Step 4: Update last login time (optional but good practice)
    await pool.query(
      'UPDATE users SET updated_at = NOW() WHERE id = $1',
      [user.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: {
          id:        user.id,
          full_name: user.full_name,
          email:     user.email,
          role:      user.role,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.',
    });
  }
};

// ─────────────────────────────────────────────
// GET current user's profile
// GET /api/users/profile
// (requires valid JWT token)
// ─────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    // req.user was attached by the authenticateToken middleware
    const result = await pool.query(
      'SELECT id, full_name, email, role, is_active, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong.',
    });
  }
};

// ─────────────────────────────────────────────
// HEALTH CHECK
// GET /health
// Used by Kubernetes to know if the service is alive
// ─────────────────────────────────────────────
const healthCheck = async (req, res) => {
  try {
    // Try a simple DB query to confirm the database is reachable
    await pool.query('SELECT 1');
    return res.status(200).json({
      success: true,
      service: 'user-service',
      status:  'healthy',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      service: 'user-service',
      status:  'unhealthy',
      error:   'Database unreachable',
    });
  }
};

module.exports = { register, login, getProfile, healthCheck };
