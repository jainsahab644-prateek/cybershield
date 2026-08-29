'use strict';

const { Pool } = require('pg');
const { env } = require('./env');

let pool;

function getPostgresPool() {
  if (env.DB_CLIENT !== 'postgres') throw new Error('PostgreSQL is not the configured database client.');
  if (!pool) {
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      min: env.DB_POOL_MIN,
      max: env.DB_POOL_MAX,
      connectionTimeoutMillis: env.DB_QUERY_TIMEOUT_MS,
      statement_timeout: env.DB_QUERY_TIMEOUT_MS,
      application_name: 'cybershield-api'
    });
  }
  return pool;
}

async function query(text, values = []) {
  return getPostgresPool().query({ text, values, statement_timeout: env.DB_QUERY_TIMEOUT_MS });
}

async function transaction(work) {
  const client = await getPostgresPool().connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function closePostgres() {
  if (!pool) return;
  const active = pool;
  pool = undefined;
  await active.end();
}

module.exports = { closePostgres, getPostgresPool, query, transaction };
