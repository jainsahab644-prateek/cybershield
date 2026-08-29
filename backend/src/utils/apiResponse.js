'use strict';

function sendSuccess(response, { statusCode = 200, message, data } = {}) {
  const payload = { success: true };
  if (response.req?.id) payload.requestId = response.req.id;
  if (message) payload.message = message;
  if (data !== undefined) payload.data = data;
  return response.status(statusCode).json(payload);
}

function sendError(response, { statusCode = 500, message, errors } = {}) {
  const payload = {
    success: false,
    message: message || 'An unexpected error occurred.',
    ...(response.req?.id ? { requestId: response.req.id } : {})
  };
  if (errors?.length) payload.errors = errors;
  return response.status(statusCode).json(payload);
}

module.exports = { sendError, sendSuccess };
