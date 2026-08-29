'use strict';

const { sendError } = require('../utils/apiResponse');

function notFound(request, response) {
  return sendError(response, {
    statusCode: 404,
    message: 'API endpoint not found.'
  });
}

module.exports = notFound;

