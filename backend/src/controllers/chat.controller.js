'use strict';

const chatAssistant = require('../services/ai/chatAssistant.service');
const { sendSuccess } = require('../utils/apiResponse');

async function chat(request, response, next) {
  try {
    const result = await chatAssistant.respond(request.validatedChatRequest);
    return sendSuccess(response, { message: 'CyberShield Assistant response ready.', data: result });
  } catch (error) {
    error.statusCode = 503;
    error.message = 'The AI assistant is temporarily unavailable. You can still use the reporting and tracking features.';
    return next(error);
  }
}

module.exports = { chat };
