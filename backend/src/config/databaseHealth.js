'use strict';

const { env } = require('./env');

async function checkDatabase() {
  if (env.DB_CLIENT === 'postgres') {
    const { query } = require('./postgres');
    await query('SELECT 1 AS healthy');
    return true;
  }
  const { getDatabase } = require('./database');
  return getDatabase().prepare('SELECT 1 AS healthy').get().healthy === 1;
}

module.exports = { checkDatabase };
