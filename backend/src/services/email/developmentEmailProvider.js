'use strict';

const logger = require('../../config/logger');

async function sendEmail() {
  logger.debug('Development email delivery skipped; no recipient or content logged');
  return { status: 'skipped', errorCode: 'development_simulated' };
}

module.exports = { name: 'development', sendEmail };
