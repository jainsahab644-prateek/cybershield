'use strict';

const crypto = require('node:crypto');
const otpRepository = require('../repositories/otp.repository');
const userRepository = require('../repositories/user.repository');
const HttpError = require('../utils/httpError');
const { generateUserId } = require('../utils/userId');
const { env } = require('../config/env');

const OTP_LIFETIME_MS = 5 * 60 * 1000;
const OTP_RESEND_MS = 30 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const MAX_ID_ATTEMPTS = 10;

function normalizeIdentifier(method, identifier) {
  const trimmed = identifier.trim();
  return method === 'email' ? trimmed.toLowerCase() : trimmed;
}

function otpDigest(method, identifier, createdAt, otp) {
  return crypto
    .createHmac('sha256', process.env.SESSION_SECRET)
    .update(`${method}|${identifier}|${createdAt}|${otp}`)
    .digest('hex');
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function publicUser(user) {
  return {
    userId: user.user_id,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    role: user.role || 'user',
    createdAt: user.created_at
  };
}

function requestOtp({ method, identifier }) {
  if ((!['development', 'test'].includes(env.NODE_ENV) && !env.DEMO_MODE) || env.DISABLE_AUTHENTICATION) {
    throw new HttpError(503, 'OTP delivery is not configured for this environment.');
  }

  const normalized = normalizeIdentifier(method, identifier);
  const now = new Date();
  const latest = otpRepository.findLatest(method, normalized);
  if (latest && now.valueOf() - new Date(latest.created_at).valueOf() < OTP_RESEND_MS) {
    throw new HttpError(429, 'Please wait before requesting another verification code.');
  }

  const developmentOtp = env.DEV_OTP;
  if (!/^\d{6}$/.test(developmentOtp || '')) {
    throw new Error('DEV_OTP must contain exactly six digits in development.');
  }

  const createdAt = now.toISOString();
  const expiresAt = new Date(now.valueOf() + OTP_LIFETIME_MS).toISOString();
  otpRepository.invalidateActive(method, normalized, createdAt);
  otpRepository.createRequest({
    identifier: normalized,
    method,
    otpHash: otpDigest(method, normalized, createdAt, developmentOtp),
    expiresAt,
    createdAt
  });

  return {
    expiresInSeconds: OTP_LIFETIME_MS / 1000,
    resendAfterSeconds: OTP_RESEND_MS / 1000,
    developmentMode: true
  };
}

function createFirstTimeUser({ method, identifier, fullName }) {
  if (!fullName) {
    throw new HttpError(400, 'Full name is required for first-time sign in.');
  }

  for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt += 1) {
    try {
      return userRepository.createUser({
        userId: generateUserId(),
        fullName,
        method,
        identifier,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      if (error?.code !== 'SQLITE_CONSTRAINT_UNIQUE') throw error;
      const existing = userRepository.findByIdentifier(method, identifier);
      if (existing) return existing;
    }
  }
  throw new Error('Unable to allocate a unique user identifier.');
}

function verifyOtp({ method, identifier, otp, fullName }) {
  if ((!['development', 'test'].includes(env.NODE_ENV) && !env.DEMO_MODE) || env.DISABLE_AUTHENTICATION) {
    throw new HttpError(503, 'OTP verification is not configured for this environment.');
  }

  const normalized = normalizeIdentifier(method, identifier);
  const request = otpRepository.findLatest(method, normalized);
  const now = new Date();
  if (!request || request.used_at || new Date(request.expires_at) <= now) {
    throw new HttpError(400, 'The verification code is invalid or expired. Request a new code.');
  }
  if (request.attempt_count >= MAX_OTP_ATTEMPTS) {
    throw new HttpError(429, 'Too many verification attempts. Request a new code.');
  }

  const submittedHash = otpDigest(method, normalized, request.created_at, otp);
  if (!safeEqual(request.otp_hash, submittedHash)) {
    otpRepository.recordFailedAttempt(request.id, now.toISOString(), MAX_OTP_ATTEMPTS);
    throw new HttpError(400, 'The verification code is invalid or expired. Request a new code.');
  }

  otpRepository.markUsed(request.id, now.toISOString());
  let user = userRepository.findByIdentifier(method, normalized)
    || createFirstTimeUser({ method, identifier: normalized, fullName });
  if (env.DEMO_MODE && method === 'email' && normalized === env.DEMO_ADMIN_EMAIL) {
    user = userRepository.promoteToAdmin(method, normalized, now.toISOString());
  }
  return { internalId: user.id, user: publicUser(user) };
}

function getUserByInternalId(id) {
  const user = userRepository.findById(id);
  return user ? { internalId: user.id, user: publicUser(user) } : null;
}

module.exports = {
  getUserByInternalId,
  normalizeIdentifier,
  publicUser,
  requestOtp,
  verifyOtp
};
