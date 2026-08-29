'use strict';

const { sendError } = require('../utils/apiResponse');

function requireAdmin(request, response, next) {
  if (request.authUser?.user?.role !== 'admin') {
    return sendError(response, {
      statusCode: 403,
      message: 'You do not have permission to access this resource.'
    });
  }
  return next();
}

module.exports = requireAdmin;
