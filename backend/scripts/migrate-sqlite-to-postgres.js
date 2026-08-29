'use strict';

const Database = require('better-sqlite3');
const { env } = require('../src/config/env');
const { getPostgresPool, closePostgres } = require('../src/config/postgres');
const { resolveDatabasePath } = require('../src/config/database');

const TABLES = [
  'users','complaints','otp_requests','complaint_evidence','complaint_notes','audit_logs',
  'complaint_status_history','suspicious_reports','notifications','notification_deliveries',
  'notification_preferences','complaint_user_messages','suspicious_report_evidence',
  'suspicious_report_notes','content_categories','learning_articles','content_tags','article_tags',
  'faqs','announcements','external_resources'
];

async function destinationColumns(client, table) {
  const result = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
    [table]
  );
  return result.rows.map((row) => row.column_name);
}

async function main() {
  if (env.DB_CLIENT !== 'postgres') throw new Error('Set DB_CLIENT=postgres and DATABASE_URL for this explicit utility.');
  const dryRun = process.argv.includes('--dry-run');
  const source = new Database(resolveDatabasePath(), { readonly: true, fileMustExist: true });
  const client = await getPostgresPool().connect();
  const report = [];
  try {
    await client.query('BEGIN');
    for (const table of TABLES) {
      const exists = source.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table);
      if (!exists) continue;
      const sourceColumns = source.prepare(`PRAGMA table_info(${table})`).all().map((column) => column.name);
      const targetColumns = await destinationColumns(client, table);
      if (!targetColumns.length) throw new Error(`Destination table ${table} is missing. Run migrations first.`);
      const columns = sourceColumns.filter((column) => targetColumns.includes(column));
      const rows = source.prepare(`SELECT ${columns.map((column) => `"${column}"`).join(',')} FROM "${table}" ORDER BY rowid`).all();
      if (!dryRun) {
        for (const row of rows) {
          const values = columns.map((column) => row[column]);
          const placeholders = values.map((_, index) => `$${index + 1}`).join(',');
          await client.query(
            `INSERT INTO "${table}" (${columns.map((column) => `"${column}"`).join(',')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
            values
          );
        }
      }
      const destination = dryRun ? 0 : Number((await client.query(`SELECT COUNT(*) AS count FROM "${table}"`)).rows[0].count);
      report.push({ table, source: rows.length, destination, mode: dryRun ? 'validated' : 'copied' });
      if (!dryRun && columns.includes('id')) {
        const sequence = (await client.query('SELECT pg_get_serial_sequence($1, $2) AS name', [table, 'id'])).rows[0].name;
        if (sequence) await client.query(
          `SELECT setval($1, COALESCE((SELECT MAX(id) FROM "${table}"), 1), (SELECT COUNT(*) > 0 FROM "${table}"))`,
          [sequence]
        );
      }
    }
    if (dryRun) await client.query('ROLLBACK'); else await client.query('COMMIT');
    console.table(report);
    if (!dryRun && report.some((item) => item.destination < item.source)) throw new Error('Count verification detected a destination mismatch.');
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* Connection may already be closed. */ }
    throw error;
  } finally {
    client.release(); source.close(); await closePostgres();
  }
}

main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
