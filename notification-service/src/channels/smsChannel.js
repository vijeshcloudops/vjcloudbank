// src/channels/smsChannel.js
//
// Sends SMS via AWS SNS (Simple Notification Service).
//
// AWS SNS can send SMS directly to phone numbers worldwide.
// No need to set up a topic — just publish directly to a phone number.
//
// LOCAL MODE: logs to console
// PRODUCTION: sends real SMS via AWS SNS

const { PublishCommand } = require('@aws-sdk/client-sns');
const { snsClient } = require('../config/awsConfig');
require('dotenv').config();

const sendSMS = async ({ phoneNumber, message }) => {
  // LOCAL DEV: just log to console
  if (process.env.USE_MOCK_NOTIFICATIONS === 'true') {
    console.log('\n📱 [MOCK SMS]');
    console.log(`   To      : ${phoneNumber}`);
    console.log(`   Message : ${message}`);
    console.log('   Status  : Would be sent via AWS SNS in production\n');
    return { success: true, mock: true };
  }

  // PRODUCTION: send real SMS via AWS SNS
  const params = {
    Message: message,
    PhoneNumber: phoneNumber, // E.164 format: +919876543210
    MessageAttributes: {
      'AWS.SNS.SMS.SenderID': {
        DataType: 'String',
        StringValue: process.env.SNS_SMS_SENDER_ID || 'VjCloudBank',
      },
      'AWS.SNS.SMS.SMSType': {
        DataType: 'String',
        // Transactional = high priority, guaranteed delivery (costs more)
        // Promotional  = lower priority, may be throttled
        StringValue: 'Transactional',
      },
    },
  };

  try {
    const command = new PublishCommand(params);
    const result = await snsClient.send(command);
    console.log(`✅ SMS sent to ${phoneNumber}: MessageId=${result.MessageId}`);
    return { success: true, messageId: result.MessageId };
  } catch (error) {
    console.error(`❌ Failed to send SMS to ${phoneNumber}:`, error.message);
    // Never throw — notification failure should not break the transaction
    return { success: false, error: error.message };
  }
};

module.exports = { sendSMS };
