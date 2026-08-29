'use strict';

const express = require('express');
const { env } = require('../config/env');
const { sendSuccess } = require('../utils/apiResponse');

const router = express.Router();
router.get('/', (request, response) => sendSuccess(response, {
  data: { demoMode: env.DEMO_MODE, assistantAvailable: env.AI_PROVIDER !== 'disabled', assistantProvider: env.AI_PROVIDER === 'mock' ? 'mock' : 'openai' }
}));

module.exports = router;
