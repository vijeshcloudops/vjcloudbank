// src/controllers/notificationController.js
//
// This is the EVENT ROUTER — decides what to send based on event type.
// Each notification type triggers the right template and channel(s).
//
// IMPORTANT DESIGN DECISION:
// Notification failures NEVER return errors to the caller.
// If an email fails, we log it but return success anyway.
// A failed notification should never cause a transaction to fail!

const { sendEmail } = require('../channels/emailChannel');
const { sendSMS } = require('../channels/smsChannel');
const {
  welcomeEmail,
  transactionAlert,
  accountOpenedEmail,
  lowBalanceAlert,
} = require('../templates/emailTemplates');

// ── Welcome notification (called by User Service on registration) ──
const sendWelcomeNotification = async (req, res) => {
  const { fullName, email, phoneNumber } = req.body;

  try {
    // Send welcome email
    const template = welcomeEmail({ fullName, email });
    await sendEmail({ to: email, ...template });

    // Send welcome SMS if phone number provided
    if (phoneNumber) {
      await sendSMS({
        phoneNumber,
        message: `Welcome to VjCloudBank, ${fullName}! Your account is now active. Start banking securely today.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Welcome notification sent.',
    });
  } catch (error) {
    console.error('Welcome notification error:', error);
    // Still return success — notification failure is non-critical
    return res.status(200).json({
      success: true,
      message: 'Notification processed (with warnings).',
    });
  }
};

// ── Transaction notification (called by Transaction Service) ───────
const sendTransactionNotification = async (req, res) => {
  const {
    fullName,
    email,
    phoneNumber,
    type,
    amount,
    currency,
    balanceAfter,
    accountNumber,
    description,
  } = req.body;

  try {
    // Send email alert
    const template = transactionAlert({
      fullName, type, amount, currency,
      balanceAfter, accountNumber, description,
      date: new Date().toLocaleString('en-IN'),
    });
    await sendEmail({ to: email, ...template });

    // Send SMS for large transactions (over 10,000)
    if (phoneNumber && parseFloat(amount) >= 10000) {
      const typeLabel = {
        DEPOSIT: 'credited to',
        WITHDRAWAL: 'debited from',
        TRANSFER_DEBIT: 'transferred from',
        TRANSFER_CREDIT: 'received in',
      }[type] || 'processed on';

      await sendSMS({
        phoneNumber,
        message: `VjCloudBank Alert: ${currency} ${amount} ${typeLabel} account ${accountNumber}. Balance: ${currency} ${balanceAfter}. Not you? Call us immediately.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Transaction notification sent.',
    });
  } catch (error) {
    console.error('Transaction notification error:', error);
    return res.status(200).json({
      success: true,
      message: 'Notification processed (with warnings).',
    });
  }
};

// ── Account opened notification ───────────────────────────────────
const sendAccountOpenedNotification = async (req, res) => {
  const { fullName, email, phoneNumber, accountNumber, accountType, currency } = req.body;

  try {
    const template = accountOpenedEmail({ fullName, accountNumber, accountType, currency });
    await sendEmail({ to: email, ...template });

    if (phoneNumber) {
      await sendSMS({
        phoneNumber,
        message: `VjCloudBank: Your ${accountType} account ${accountNumber} is now open and ready to use.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Account opened notification sent.',
    });
  } catch (error) {
    console.error('Account opened notification error:', error);
    return res.status(200).json({
      success: true,
      message: 'Notification processed (with warnings).',
    });
  }
};

// ── Low balance alert ─────────────────────────────────────────────
const sendLowBalanceAlert = async (req, res) => {
  const { fullName, email, phoneNumber, accountNumber, balance, currency, threshold } = req.body;

  try {
    const template = lowBalanceAlert({ fullName, accountNumber, balance, currency, threshold });
    await sendEmail({ to: email, ...template });

    if (phoneNumber) {
      await sendSMS({
        phoneNumber,
        message: `VjCloudBank Alert: Low balance of ${currency} ${balance} on account ${accountNumber}. Minimum threshold: ${currency} ${threshold}. Please deposit funds.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Low balance alert sent.',
    });
  } catch (error) {
    console.error('Low balance alert error:', error);
    return res.status(200).json({
      success: true,
      message: 'Notification processed (with warnings).',
    });
  }
};

// ── Health check ──────────────────────────────────────────────────
const healthCheck = (req, res) => {
  return res.status(200).json({
    success: true,
    service: 'notification-service',
    status: 'healthy',
    mode: process.env.USE_MOCK_NOTIFICATIONS === 'true' ? 'mock' : 'live',
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  sendWelcomeNotification,
  sendTransactionNotification,
  sendAccountOpenedNotification,
  sendLowBalanceAlert,
  healthCheck,
};
