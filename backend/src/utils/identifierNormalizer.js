'use strict';

const crypto = require('node:crypto');
const HttpError = require('./httpError');
let developmentFallbackWarningShown = false;

function normalizePhone(value) {
  const input = String(value).trim();
  const plus = input.startsWith('+') ? '+' : '';
  const digits = input.replace(/\D/g, '');
  if (!/^\d{10,15}$/.test(digits)) throw new HttpError(400, 'Phone number must contain 10 to 15 digits.');
  return `${plus}${digits}`;
}

function normalizeEmail(value) {
  const input = String(value).trim();
  const split = input.lastIndexOf('@');
  if (split < 1 || split === input.length - 1 || input.length > 254 || /\s/.test(input)) {
    throw new HttpError(400, 'Enter a valid email address.');
  }
  return `${input.slice(0, split)}@${input.slice(split + 1).toLowerCase()}`;
}

function normalizeWebsite(value) {
  let parsed;
  try { parsed = new URL(String(value).trim()); } catch { throw new HttpError(400, 'Enter a valid HTTP or HTTPS website URL.'); }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new HttpError(400, 'Enter a valid HTTP or HTTPS website URL.');
  }
  parsed.hash = '';
  parsed.hostname = parsed.hostname.toLowerCase();
  if ((parsed.protocol === 'http:' && parsed.port === '80') || (parsed.protocol === 'https:' && parsed.port === '443')) parsed.port = '';
  return parsed.href;
}

function normalizeHandle(value) {
  const normalized = String(value).trim().replace(/^@+/, '');
  if (normalized.length < 2 || normalized.length > 150 || /\s/.test(normalized)) {
    throw new HttpError(400, 'Enter a valid account handle without spaces.');
  }
  return normalized;
}

function normalizePlain(value) {
  const normalized = String(value).trim();
  if (normalized.length < 2 || normalized.length > 254) throw new HttpError(400, 'Identifier must be between 2 and 254 characters.');
  return normalized;
}

function normalizeIdentifier(type, value) {
  if (type === 'phone') return normalizePhone(value);
  if (type === 'email') return normalizeEmail(value);
  if (type === 'website') return normalizeWebsite(value);
  if (['social_handle', 'messaging_handle'].includes(type)) return normalizeHandle(value);
  return normalizePlain(value);
}

function hashIdentifier(type, normalized) {
  let secret = process.env.IDENTIFIER_HASH_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('IDENTIFIER_HASH_SECRET must be configured in production.');
  }
  if (!secret) {
    secret = process.env.SESSION_SECRET;
    if (!developmentFallbackWarningShown) {
      console.warn('[privacy] IDENTIFIER_HASH_SECRET is unset; using SESSION_SECRET for local compatibility only.');
      developmentFallbackWarningShown = true;
    }
  }
  if (!secret) throw new Error('IDENTIFIER_HASH_SECRET is required.');
  return crypto.createHmac('sha256', secret).update(`${type}\0${normalized}`, 'utf8').digest('hex');
}

module.exports = { hashIdentifier, normalizeIdentifier };
