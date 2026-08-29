'use strict';

const { rateLimit } = require('express-rate-limit');
const { sendError } = require('../utils/apiResponse');
const { env } = require('../config/env');

function rateLimitHandler(request, response) {
  return sendError(response, {
    statusCode: 429,
    message: 'Too many requests. Please try again later.'
  });
}

const generalApiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_GENERAL,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: rateLimitHandler
});

const complaintCreationLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_COMPLAINT,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: rateLimitHandler
});

const otpRequestLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_OTP_REQUEST,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: rateLimitHandler
});

const otpVerificationLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_OTP_VERIFY,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: rateLimitHandler
});

const evidenceUploadLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_EVIDENCE,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: rateLimitHandler
});

const adminMutationLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_ADMIN,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: rateLimitHandler
});

const suspiciousReportLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_SUSPICIOUS_REPORT,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: rateLimitHandler
});

const suspiciousLookupLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_SUSPICIOUS_LOOKUP,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: rateLimitHandler
});

const aiAssistantLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_AI_ASSISTANT,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: rateLimitHandler
});

const chatLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_CHAT,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: rateLimitHandler
});

module.exports = {
  aiAssistantLimiter,
  adminMutationLimiter,
  chatLimiter,
  complaintCreationLimiter,
  evidenceUploadLimiter,
  generalApiLimiter,
  otpRequestLimiter,
  otpVerificationLimiter,
  suspiciousLookupLimiter,
  suspiciousReportLimiter
};
