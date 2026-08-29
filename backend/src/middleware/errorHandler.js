'use strict';

const multer = require('multer');
const { sendError } = require('../utils/apiResponse');

function errorHandler(error, request, response, next) {
  if (response.headersSent) return next(error);

  if (error?.type === 'entity.parse.failed') {
    return sendError(response, {
      statusCode: 400,
      message: 'Request body contains invalid JSON.'
    });
  }

  if (error?.type === 'entity.too.large') {
    return sendError(response, {
      statusCode: 413,
      message: 'Request body is too large.'
    });
  }

  if (error instanceof multer.MulterError) {
    request.log?.warn({ requestId: request.id, uploadErrorCode: error.code }, 'Evidence upload rejected');
    if (error.code === 'LIMIT_FILE_SIZE') {
      return sendError(response, {
        statusCode: 413,
        message: 'Evidence file exceeds the maximum allowed size.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_PART_COUNT') {
      return sendError(response, {
        statusCode: 400,
        message: 'Maximum evidence limit reached.'
      });
    }
    return sendError(response, {
      statusCode: 400,
      message: 'The evidence upload could not be processed.'
    });
  }

  if (Number.isInteger(error?.statusCode) && error.statusCode >= 400 && error.statusCode < 600) {
    return sendError(response, {
      statusCode: error.statusCode,
      message: error.message
    });
  }

  request.log?.error({ requestId: request.id, err: error }, 'Unexpected request failure');
  return sendError(response, {
    statusCode: 500,
    message: 'An unexpected error occurred.'
  });
}

module.exports = errorHandler;
