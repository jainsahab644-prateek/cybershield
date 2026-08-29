# Backup and restore

Backups can contain fictional personal data, complaints, and evidence metadata. Store them outside public web roots with restricted access. `backend/backups/` is ignored by Git.

## SQLite

`npm run db:backup` uses SQLite's online backup API and writes a UTC-timestamped `.db` file. To restore, stop the application, preserve the current database, copy the selected backup to `DATABASE_PATH`, start, check `db:status`, and run `verify`. Restore corresponding evidence files with their metadata.

## PostgreSQL

With PostgreSQL client tools and validated configuration, `npm run db:backup` invokes `pg_dump --format=custom` without printing or embedding the password. Restore into a new database:

```bash
pg_restore --clean --if-exists --no-owner --dbname "$RESTORE_DATABASE_URL" backups/cybershield-TIMESTAMP.dump
```

Then check migration status, readiness, row counts, and tests.

**Always restore into a test environment first.** Never overwrite the only working database or delete source SQLite during migration.
