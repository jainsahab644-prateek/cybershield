'use strict';

function configuration() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  return { apiKey, from, valid: Boolean(apiKey && from) };
}

async function sendEmail({ to, subject, text, html }) {
  const config = configuration();
  if (!config.valid) {
    return { status: 'failed', errorCode: 'resend_configuration_missing', retryable: false };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ from: config.from, to: [to], subject, text, html }),
      signal: AbortSignal.timeout(require('../../config/env').env.EMAIL_TIMEOUT_MS)
    });
    if (response.ok) return { status: 'sent' };
    return {
      status: 'failed',
      errorCode: `resend_http_${response.status}`,
      retryable: response.status === 429 || response.status >= 500
    };
  } catch (error) {
    return {
      status: 'failed',
      errorCode: error?.name === 'TimeoutError' ? 'resend_timeout' : 'resend_network_error',
      retryable: true
    };
  }
}

module.exports = { configuration, name: 'resend', sendEmail };
