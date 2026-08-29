'use strict';

const { env } = require('./config/env');
const logger = require('./config/logger');
const app = require('./app');
const { closeDatabase, initializeDatabase, resolveDatabasePath } = require('./config/database');
const { initializeEvidenceStorage } = require('./config/evidence');
const { validateEmailConfiguration } = require('./services/email/emailProvider');

const { closePostgres } = require('./config/postgres');
const port = env.PORT;
let server;
let shuttingDown = false;

try {
  if (env.DB_CLIENT === 'sqlite') initializeDatabase();
  initializeEvidenceStorage();
  validateEmailConfiguration();
  server = app.listen(port, () => {
    logger.info({ port, databaseClient: env.DB_CLIENT }, 'CyberShield API started');
    if (env.DB_CLIENT === 'sqlite') logger.info({ databasePath: resolveDatabasePath() }, 'SQLite database initialized');
  });
  server.requestTimeout = env.SERVER_REQUEST_TIMEOUT_MS;
  server.headersTimeout = env.SERVER_HEADERS_TIMEOUT_MS;
} catch (error) {
  logger.fatal({ err: error }, 'CyberShield failed to start');
  process.exit(1);
}

async function stopServer(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Graceful shutdown started');
  const forceTimer = setTimeout(() => {
    logger.error('Graceful shutdown deadline exceeded');
    process.exit(1);
  }, 10000).unref();
  await new Promise((resolve) => server.close(resolve));
  closeDatabase();
  await closePostgres();
  clearTimeout(forceTimer);
  logger.info('Graceful shutdown completed');
  process.exit(0);
}

process.once('SIGINT', () => stopServer('SIGINT'));
process.once('SIGTERM', () => stopServer('SIGTERM'));

module.exports = server;
