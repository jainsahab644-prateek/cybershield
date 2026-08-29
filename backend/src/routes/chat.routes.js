'use strict';

const express = require('express');
const chatController = require('../controllers/chat.controller');
const { chatLimiter } = require('../middleware/rateLimiter');
const { validateChatRequest } = require('../validators/chat.validator');

const router = express.Router();
router.post('/', chatLimiter, validateChatRequest, chatController.chat);

module.exports = router;
