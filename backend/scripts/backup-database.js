'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const Database = require('better-sqlite3');
const { env } = require('../src/config/env');
const { resolveDatabasePath } = require('../src/config/database');

function stamp() { return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z'); }

async function main() {
  const directory = path.resolve(__dirname, '..', 'backups');
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (env.DB_CLIENT === 'sqlite') {
    const destination = path.join(directory, `cybershield-${stamp()}.db`);
    const source = new Database(resolveDatabasePath(), { readonly: true, fileMustExist: true });
    try { await source.backup(destination); } finally { source.close(); }
    process.stdout.write(`SQLite backup created: ${destination}\n`);
    return;
  }
  const destination = path.join(directory, `cybershield-${stamp()}.dump`);
  const result = spawnSync('pg_dump', ['--format=custom', '--file', destination, env.DATABASE_URL], {
    stdio: ['ignore', 'inherit', 'inherit'], env: process.env, shell: false
  });
  if (result.error?.code === 'ENOENT') throw new Error('pg_dump is not installed. See docs/BACKUP_AND_RESTORE.md.');
  if (result.status !== 0) throw new Error(`pg_dump failed with exit code ${result.status}.`);
  process.stdout.write(`PostgreSQL backup created: ${destination}\n`);
}

main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
