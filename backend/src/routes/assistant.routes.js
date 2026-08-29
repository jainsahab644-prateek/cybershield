'use strict';

const express = require('express');
const assistantController = require('../controllers/assistant.controller');
const { aiAssistantLimiter } = require('../middleware/rateLimiter');
const { validateAssistantRequest } = require('../validators/assistant.validator');

const router = express.Router();
router.post('/classify-incident', aiAssistantLimiter, validateAssistantRequest, assistantController.classifyIncident);

module.exports = router;
