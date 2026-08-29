'use strict';

const session = require('express-session');
const { env } = require('./env');

const SESSION_COOKIE_NAME = 'cybershield.sid';

function sessionMaxAge() {
  return env.SESSION_MAX_AGE;
}

function createSessionMiddleware() {
  const secret = env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must contain at least 32 characters.');
  }

  const production = env.NODE_ENV === 'production';
  let store;
  if (env.DB_CLIENT === 'postgres') {
    const connectPgSimple = require('connect-pg-simple');
    const { getPostgresPool } = require('./postgres');
    const PgStore = connectPgSimple(session);
    store = new PgStore({ pool: getPostgresPool(), tableName: 'user_sessions', createTableIfMissing: false });
  }
  return session({
    name: SESSION_COOKIE_NAME,
    secret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    ...(store ? { store } : {}),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: production,
      maxAge: sessionMaxAge()
    }
  });
}

module.exports = { SESSION_COOKIE_NAME, createSessionMiddleware, sessionMaxAge };
