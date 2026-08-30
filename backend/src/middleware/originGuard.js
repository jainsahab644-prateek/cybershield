'use strict';

const { sendError } = require('../utils/apiResponse');
const { env } = require('../config/env');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function originGuard(request, response, next) {
  if (SAFE_METHODS.has(request.method)) return next();

  const origin = request.get('origin');
  if (!origin) return next();

  let originHost = '';
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch (err) {
    originHost = '';
  }

  const reqHost = (request.get('host') || '').toLowerCase();

  // Same host (ignoring protocol http vs https mismatch behind proxies)
  if (originHost && reqHost && originHost === reqHost) return next();

  // Check explicitly configured client origins by host or exact match
  const matchesAllowed = env.clientOrigins.some((allowed) => {
    try {
      return new URL(allowed).host.toLowerCase() === originHost;
    } catch (err) {
      return allowed === origin;
    }
  });
  if (matchesAllowed) return next();

  // Allow Netlify and Render app subdomains for deployed app
  if (originHost.endsWith('.netlify.app') || originHost.endsWith('.onrender.com')) {
    return next();
  }

  return sendError(response, {
    statusCode: 403,
    message: 'This request origin is not allowed.'
  });
}

module.exports = originGuard;

