'use strict';

const crypto = require('node:crypto');
const pinoHttp = require('pino-http');
const logger = require('../config/logger');

const httpLogger = pinoHttp({
  logger,
  genReqId(request, response) {
    const requestId = `req_${crypto.randomUUID()}`;
    response.setHeader('X-Request-ID', requestId);
    return requestId;
  },
  customProps(request) { return { requestId: request.id }; },
  serializers: {
    req(request) { return { requestId: request.id, method: request.method, path: request.url }; },
    res(response) { return { status: response.statusCode }; }
  }
});

module.exports = httpLogger;
