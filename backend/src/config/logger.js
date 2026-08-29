'use strict';

const pino = require('pino');
const { env } = require('./env');

const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'cybershield-api', environment: env.NODE_ENV },
  redact: {
    paths: [
      'req.headers.authorization', 'req.headers.cookie', 'request.headers.authorization',
      'request.headers.cookie', '*.otp', '*.password', '*.cvv', '*.upiPin',
      '*.sessionSecret', '*.databaseUrl', '*.apiKey'
    ],
    censor: '[REDACTED]'
  }
});

module.exports = logger;
