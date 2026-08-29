'use strict';

const { sendError } = require('../utils/apiResponse');
const { env } = require('../config/env');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function originGuard(request, response, next) {
  if (SAFE_METHODS.has(request.method)) return next();

  const origin = request.get('origin');
  if (!origin) return next();

  const sameOrigin = `${request.protocol}://${request.get('host')}`;
  if (env.clientOrigins.includes(origin) || origin === sameOrigin) return next();

  return sendError(response, {
    statusCode: 403,
    message: 'This request origin is not allowed.'
  });
}

module.exports = originGuard;
