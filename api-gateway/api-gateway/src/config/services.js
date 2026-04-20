// src/config/services.js
//
// Central place for all downstream service URLs.
// Local:      http://localhost:PORT
// Production: http://service-name.vjcloudbank.svc.cluster.local:PORT
//             (Kubernetes internal DNS — services talk to each other by name)

require('dotenv').config();

const services = {
  user: {
    url: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    name: 'User Service',
  },
  account: {
    url: process.env.ACCOUNT_SERVICE_URL || 'http://localhost:3002',
    name: 'Account Service',
  },
  transaction: {
    url: process.env.TRANSACTION_SERVICE_URL || 'http://localhost:3003',
    name: 'Transaction Service',
  },
  notification: {
    url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004',
    name: 'Notification Service',
  },
};

// Public routes — JWT verification is SKIPPED for these
// Everything else requires a valid token
const publicRoutes = [
  { path: '/api/users/register', method: 'POST' },
  { path: '/api/users/login',    method: 'POST' },
  { path: '/api/users/health',   method: 'GET'  },
  { path: '/health',             method: 'GET'  },
];

const isPublicRoute = (path, method) => {
  return publicRoutes.some(
    route => path === route.path && method === route.method
  );
};

module.exports = { services, publicRoutes, isPublicRoute };
