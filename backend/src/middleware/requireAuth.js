'use strict';

const authService = require('../services/auth.service');
const { sendError } = require('../utils/apiResponse');

function loadAuthenticatedUser(request) {
  const internalId = request.session?.userId;
  return internalId ? authService.getUserByInternalId(internalId) : null;
}

function requireAuth(request, response, next) {
  const authenticated = loadAuthenticatedUser(request);
  if (!authenticated) {
    return sendError(response, { statusCode: 401, message: 'Authentication required.' });
  }
  request.authUser = authenticated;
  return next();
}

function attachAuthUser(request, response, next) {
  request.authUser = loadAuthenticatedUser(request);
  return next();
}

module.exports = { attachAuthUser, requireAuth };
