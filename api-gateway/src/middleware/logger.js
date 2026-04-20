// src/middleware/logger.js
//
// Logs every request with timing information.
// In production this feeds into CloudWatch for monitoring.
// morgan is the industry standard HTTP request logger for Node.js.

const morgan = require('morgan');
const winston = require('winston');

// Winston logger — structured JSON logs for CloudWatch
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
      ),
    }),
  ],
});

// Morgan token for response time
const requestLogger = morgan((tokens, req, res) => {
  const log = {
    method:       tokens.method(req, res),
    url:          tokens.url(req, res),
    status:       tokens.status(req, res),
    responseTime: `${tokens['response-time'](req, res)}ms`,
    userAgent:    tokens['user-agent'](req, res),
    userId:       req.headers['x-user-id'] || 'anonymous',
  };
  logger.info('Request', log);
  return null; // morgan won't write anything itself
});

module.exports = { requestLogger, logger };
