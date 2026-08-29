'use strict';

const express = require('express');
const { sendSuccess } = require('../utils/apiResponse');
const { checkDatabase } = require('../config/databaseHealth');
const { env } = require('../config/env');

const router = express.Router();

router.get('/', (request, response) => sendSuccess(response, {
  message: 'CyberShield API is running',
  data: {
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString()
  }
}));

router.get('/live', (request, response) => sendSuccess(response, {
  data: { status: 'live', timestamp: new Date().toISOString() }
}));

router.get('/ready', async (request, response) => {
  try {
    await checkDatabase();
    return sendSuccess(response, { data: { status: 'ready' } });
  } catch (error) {
    request.log?.warn({ err: error, requestId: request.id }, 'Readiness database check failed');
    return response.status(503).json({ success: false, status: 'not_ready', requestId: request.id });
  }
});

module.exports = router;
