# CyberShield architecture

CyberShield is a demonstration application, not an official reporting authority.

```text
Browser (HTML/CSS/vanilla JS)
  -> Express route -> middleware -> controller -> service -> repository -> database
                                      |                         |
                                      +-> notification/email    +-> private evidence storage
```

## Frontend

The `frontend/` directory is static content. `frontend/js/api.js` is the single API-base configuration point and defaults to same-origin `/api/v1`. UI code builds untrusted content with DOM nodes and `textContent`; controlled article Markdown never becomes unrestricted HTML.

## API layers

Middleware handles request IDs, structured logs, security headers, CORS/origin checks, sessions, rate limits, authentication, authorization, validation, caching, and uploads. Controllers translate HTTP. Services own workflow rules. Repositories contain parameterized database queries.

## Database

SQLite remains the local/test database. Ordered migrations 1–7 preserve the historical schema and migration 8 adds list-query indexes. PostgreSQL uses a shared `pg.Pool`, transactional migrations in `migrations/postgres/`, and retention-aware restrictive foreign keys. `schema_migrations` records each migration once.

The explicit transfer utility copies SQLite rows in dependency order, preserves IDs/timestamps, uses conflict-safe inserts, supports `--dry-run`, and never deletes the source.

## Authentication and sessions

Development/test authentication uses the fixed local OTP only. Session identifiers remain in HttpOnly cookies. SQLite development uses the in-memory session store; PostgreSQL uses `connect-pg-simple`. Production authentication is disabled until a real OTP provider is implemented.

## Evidence storage

Evidence metadata is in the database. Bytes are outside the public frontend behind `storageProvider`. The local provider exposes `saveFile`, `readFile`, `fileExists`, `pathFor`, and `deleteTemporaryFile`, constrains paths to its root, and leaves room for a future S3-compatible provider.

## Operations

Pino JSON logs go to stdout/stderr. Every request receives `X-Request-ID`. `/health/live` checks the process and `/health/ready` checks the configured database. SIGINT/SIGTERM stop new connections, close HTTP and database resources, then exit.
