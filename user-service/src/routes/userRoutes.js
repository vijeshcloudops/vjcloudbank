// src/routes/userRoutes.js
//
// Routes define the URL endpoints of our service.
// Think of routes as a menu in a restaurant -
// they list what's available and what you need to provide.
//
// Pattern: router.METHOD('/path', [middleware], controller)

const express    = require('express');
const { body }   = require('express-validator');
const router     = express.Router();

const { register, login, getProfile, healthCheck } = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

// ─── Health check (no auth needed) ───────────────────────────────────
// Kubernetes calls this endpoint every few seconds to check if our
// service is alive. If it fails, Kubernetes restarts the container.
router.get('/health', healthCheck);

// ─── Register ─────────────────────────────────────────────────────────
// Validation rules run BEFORE the controller.
// express-validator checks the data and stores any errors.
// The controller then reads those errors with validationResult().
router.post(
  '/register',
  [
    body('full_name')
      .trim()
      .notEmpty().withMessage('Full name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),

    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Must be a valid email address'),

    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
      .matches(/[0-9]/).withMessage('Password must contain at least one number'),
  ],
  register
);

// ─── Login ────────────────────────────────────────────────────────────
router.post(
  '/login',
  [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Must be a valid email address'),

    body('password')
      .notEmpty().withMessage('Password is required'),
  ],
  login
);

// ─── Get Profile ──────────────────────────────────────────────────────
// authenticateToken runs first. If the token is invalid, it returns 401
// and getProfile never runs. This is how we protect routes.
router.get('/profile', authenticateToken, getProfile);

module.exports = router;
