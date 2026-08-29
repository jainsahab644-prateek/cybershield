'use strict';

async function sendEmail() {
  return { status: 'skipped', errorCode: 'email_disabled', retryable: false };
}

module.exports = { name: 'disabled', sendEmail };
