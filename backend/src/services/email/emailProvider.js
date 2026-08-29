'use strict';

const developmentProvider = require('./developmentEmailProvider');
const resendProvider = require('./resendEmailProvider');
const disabledProvider = require('./disabledEmailProvider');
const { env } = require('../../config/env');
const logger = require('../../config/logger');

function configuredProviderName() {
  const runtimeValue = String(process.env.EMAIL_PROVIDER || env.EMAIL_PROVIDER).trim().toLowerCase();
  return ['disabled', 'development', 'resend'].includes(runtimeValue) ? runtimeValue : env.EMAIL_PROVIDER;
}

function getEmailProvider() {
  const provider = configuredProviderName();
  if (provider === 'resend') return resendProvider;
  if (provider === 'disabled') return disabledProvider;
  return developmentProvider;
}

function validateEmailConfiguration() {
  const raw = configuredProviderName();
  if (raw === 'resend' && !resendProvider.configuration().valid) {
    logger.warn('Resend is selected but its API key or sender is missing; delivery will fail safely');
  }
}

module.exports = { configuredProviderName, getEmailProvider, validateEmailConfiguration };
