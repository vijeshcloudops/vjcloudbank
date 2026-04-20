// src/channels/emailChannel.js
//
// Sends emails via AWS SES (Simple Email Service).
//
// LOCAL MODE (USE_MOCK_NOTIFICATIONS=true):
//   Logs the email to console — no AWS account needed
//
// PRODUCTION MODE (USE_MOCK_NOTIFICATIONS=false):
//   Sends real emails via AWS SES
//   Requires: verified sender email in SES console
//
// AWS SES SETUP (for production):
//   1. Go to AWS Console → SES
//   2. Verify your domain or email address
//   3. Request production access (sandbox limits to verified emails only)

const { SendEmailCommand } = require('@aws-sdk/client-ses');
const { sesClient } = require('../config/awsConfig');
require('dotenv').config();

const sendEmail = async ({ to, subject, html }) => {
  // LOCAL DEV: just log to console
  if (process.env.USE_MOCK_NOTIFICATIONS === 'true') {
    console.log('\n📧 [MOCK EMAIL]');
    console.log(`   To      : ${to}`);
    console.log(`   Subject : ${subject}`);
    console.log(`   Body    : [HTML template — ${html.length} chars]`);
    console.log('   Status  : Would be sent via AWS SES in production\n');
    return { success: true, mock: true };
  }

  // PRODUCTION: send real email via AWS SES
  const params = {
    Source: `${process.env.SES_FROM_NAME} <${process.env.SES_FROM_EMAIL}>`,
    Destination: {
      ToAddresses: Array.isArray(to) ? to : [to],
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: html,
          Charset: 'UTF-8',
        },
      },
    },
  };

  try {
    const command = new SendEmailCommand(params);
    const result = await sesClient.send(command);
    console.log(`✅ Email sent to ${to}: MessageId=${result.MessageId}`);
    return { success: true, messageId: result.MessageId };
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    // We don't throw — notification failures should never break the main flow
    return { success: false, error: error.message };
  }
};

module.exports = { sendEmail };
