'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { env } = require('../src/config/env');

async function migratePostgres() {
  const { getPostgresPool, closePostgres } = require('../src/config/postgres');
  const pool = getPostgresPool();
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  const directory = path.resolve(__dirname, '..', 'migrations', 'postgres');
  const files = fs.readdirSync(directory).filter((file) => /^\d+_.+\.sql$/.test(file)).sort();
  for (const file of files) {
    const version = Number.parseInt(file.split('_')[0], 10);
    const exists = await pool.query('SELECT 1 FROM schema_migrations WHERE version=$1', [version]);
    if (exists.rowCount) continue;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(fs.readFileSync(path.join(directory, file), 'utf8'));
      await client.query('INSERT INTO schema_migrations(version,name) VALUES($1,$2)', [version, file]);
      await client.query('COMMIT');
      process.stdout.write(`Applied PostgreSQL migration ${file}\n`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`PostgreSQL migration ${file} failed: ${error.message}`, { cause: error });
    } finally { client.release(); }
  }
  await closePostgres();
}

async function main() {
  if (env.DB_CLIENT === 'postgres') return migratePostgres();
  const { initializeDatabase, closeDatabase } = require('../src/config/database');
  initializeDatabase();
  closeDatabase();
  process.stdout.write('SQLite migrations are current.\n');
}

main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
