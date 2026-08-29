'use strict';

const complaintAssistant = require('../services/ai/complaintAssistant.service');
const { sendSuccess } = require('../utils/apiResponse');

async function classifyIncident(request, response, next) {
  try {
    const classification = await complaintAssistant.classifyIncident(request.validatedAssistantRequest.description);
    return sendSuccess(response, { message: 'Category suggestion ready.', data: classification });
  } catch (error) {
    error.statusCode = 503;
    error.message = 'The assistant is temporarily unavailable. You can still choose a category manually.';
    return next(error);
  }
}

module.exports = { classifyIncident };
