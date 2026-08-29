'use strict';

const { env } = require('../src/config/env');

async function main() {
  if (env.DB_CLIENT === 'postgres') {
    const { query, closePostgres } = require('../src/config/postgres');
    const result = await query('SELECT version,name,applied_at FROM schema_migrations ORDER BY version');
    console.table(result.rows);
    await closePostgres();
    return;
  }
  const { getDatabase, closeDatabase } = require('../src/config/database');
  console.table(getDatabase().prepare('SELECT version,name,applied_at FROM schema_migrations ORDER BY version').all());
  closeDatabase();
}

main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
