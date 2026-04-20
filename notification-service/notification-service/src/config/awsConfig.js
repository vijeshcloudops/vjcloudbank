// src/config/awsConfig.js
//
// Sets up AWS SDK clients for SES (email) and SNS (SMS).
//
// HOW AUTHENTICATION WORKS:
//
// Local development:
//   Uses AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY from .env file
//   These come from an IAM user you create in AWS console
//
// Production (AWS EKS):
//   NO keys needed! The EKS node has an IAM Role attached to it.
//   AWS SDK automatically detects and uses the role credentials.
//   This is called "IAM Role for Service Accounts" (IRSA) —
//   a very important AWS security concept for interviews!

const { SESClient } = require('@aws-sdk/client-ses');
const { SNSClient } = require('@aws-sdk/client-sns');
require('dotenv').config();

const awsConfig = {
  region: process.env.AWS_REGION || 'ap-south-1',
  // In production on EKS, credentials come from the IAM role automatically
  // In local dev, they come from environment variables
  ...(process.env.AWS_ACCESS_KEY_ID && {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  }),
};

const sesClient = new SESClient(awsConfig);
const snsClient = new SNSClient(awsConfig);

module.exports = { sesClient, snsClient };
