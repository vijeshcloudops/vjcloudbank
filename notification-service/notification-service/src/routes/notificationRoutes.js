// src/routes/notificationRoutes.js
//
// All notification endpoints are internal — only called by
// other services, never directly by the frontend or end user.
// We still verify JWT to ensure only trusted services can call us.

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  sendWelcomeNotification,
  sendTransactionNotification,
  sendAccountOpenedNotification,
  sendLowBalanceAlert,
  healthCheck,
} = require('../controllers/notificationController');

// Health check — no auth needed
router.get('/health', healthCheck);

// Welcome notification — triggered by User Service on registration
router.post(
  '/welcome',
  [
    body('fullName').notEmpty().withMessage('fullName is required'),
    body('email').isEmail().withMessage('Valid email is required'),
  ],
  sendWelcomeNotification
);

// Transaction alert — triggered by Transaction Service
router.post(
  '/transaction',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('type').notEmpty().withMessage('Transaction type is required'),
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('accountNumber').notEmpty().withMessage('Account number is required'),
  ],
  sendTransactionNotification
);

// Account opened — triggered by Account Service
router.post(
  '/account-opened',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('accountNumber').notEmpty().withMessage('Account number is required'),
  ],
  sendAccountOpenedNotification
);

// Low balance alert — triggered by Transaction Service
router.post(
  '/low-balance',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('accountNumber').notEmpty().withMessage('Account number is required'),
    body('balance').isNumeric().withMessage('Balance must be a number'),
  ],
  sendLowBalanceAlert
);

module.exports = router;
