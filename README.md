# CyberShield

> **Hackathon Prototype — Not an official government or police service.**

CyberShield is an original educational cybercrime awareness and fictional reporting application.

It is not connected to the Government of India, police, I4C, the Ministry of Home Affairs, banks, telecom operators, payment networks, or law-enforcement systems. Use fictional sample data only.

## Architecture and technology

```text
HTML/CSS/vanilla JavaScript -> Express -> controller -> service -> repository -> SQLite
                                                                      |
                                                    PostgreSQL migration path
```

Node.js 22+, Express 5, SQLite, PostgreSQL, Zod, Helmet, Pino, Vitest, Supertest, ESLint, and a bounded native performance harness are used. See [Architecture](docs/ARCHITECTURE.md) and [Security](docs/SECURITY.md).

## Problem

People experiencing a cyber incident may not know which category fits, what information matters, or how to complete a long reporting process.

## Solution

CyberShield begins with plain language, offers an advisory category suggestion, guides the citizen through relevant questions, provides a review step, creates a synthetic reference ID, and supports mock tracking.

## Reviewer Quick Start

1. Open the application homepage.
2. Click **Report a Cyber Incident**.
3. Describe what happened in plain language (or use the prefilled example).
4. View the AI category suggestion, then accept or select a category.
5. Answer the guided reporting questions.
6. (Optional) Upload a test screenshot or PDF evidence.
7. Review your information on the Review screen.
8. Click **Submit Complaint** to generate a synthetic Reference ID.
9. Click **Track Complaint** and paste the Reference ID to view the status.

For testing authenticated features (Dashboard & Evidence), use verification code: `123456`.

## Demo journey

```text
Homepage → Report a Cyber Incident → AI Category Assistance → Guided Questions
→ Review → Submit Complaint → Reference ID → Track Complaint
```

## Features

Phases 1–9 provide the public portal, fictional complaints/tracking, development OTP, owned dashboards, evidence, administration, audited workflows, notifications, suspicious-activity reporting/lookup, and managed learning articles, FAQs, and demo announcements. Phase 10 adds validated configuration, migrations, PostgreSQL operational tooling, structured logging/request IDs, health checks, graceful shutdown, backups, Docker, CI, security tests, and performance tooling.

## Hackathon Prototype

### Problem

Citizens may struggle to identify the correct cybercrime category, understand what information is required, and complete long forms—especially on a mobile device or with limited digital experience.

### Solution

CyberShield provides a plain-language journey: describe what happened, receive an optional category suggestion, keep control of the choice, answer guided questions, review the fictional information, create a demo reference ID, and track its demo status.

### What works

- Citizen-friendly incident choices and optional complaint assistant
- Deterministic mock classifications by default, or an OpenAI Responses API provider when configured
- Server-side structured-output validation, secret redaction, rate limiting, and manual fallback
- Guided complaint form, optional synthetic evidence, review/edit controls, submission, reference ID, and tracking
- Existing authentication, citizen dashboard, administration, content, audit and notification demonstrations

### What is mocked

- Government or police submission and every government interaction
- Demo OTP delivery (`123456` in development; no real SMS is sent)
- Complaint statuses and reference IDs
- Synthetic evidence and contact details
- Assistant responses when `AI_PROVIDER=mock`

### OpenAI usage

Codex was meaningfully used to build and refine the application, including the citizen journey, backend architecture, safety controls, accessibility, testing and documentation. When `AI_PROVIDER=openai`, the server sends only a redacted incident description to the OpenAI Responses API and validates the structured result before returning it. The API key is server-side only. When `AI_PROVIDER=mock`, the UI explicitly labels the deterministic response as a demo suggestion.

### Codex usage

Codex was used to implement and iteratively refine the multi-step citizen workflow, Express APIs, validation, persistence, security controls, responsive and accessible UI, automated tests, deployment checks, and submission documentation. It also helped reproduce browser failures and verify assistant fallback, complaint submission, reference generation, and tracking.

Five fictional reviewer scenarios and expected paths are documented in [docs/HACKATHON_TEST_SCENARIOS.md](docs/HACKATHON_TEST_SCENARIOS.md).

## Project structure

```text
frontend/                 accessible static UI
backend/src/              API and application layers
backend/migrations/       SQLite/PostgreSQL migration assets
backend/tests/            unit and HTTP integration tests
backend/scripts/          migration, backup, verification, performance tools
database/                 database notes
docs/                     architecture, security, restore, deployment guidance
```

## Development setup

```bash
cd backend
npm install
copy .env.example .env   # Windows; use cp on Unix
npm run db:migrate
npm start
```

Open `http://localhost:5000`. Development uses SQLite and fictional OTP `123456`. Citizen authentication uses `/pages/login.html`. The separate protected administration sign-in is `/admin/login.html`; it uses the configured fictional email `admin@cybershield.demo`, and demo mode grants only that identifier the admin role after OTP verification. Never use a real OTP or credentials.

## Environment variables

Copy `backend/.env.example` locally. Central validation covers environment, demo/AI provider settings, database client/path/URL/pool/timeouts, origins, sessions, development OTP, email, evidence, identifier hashing, logging, proxy topology, server timeouts, and rate limits. `DEMO_MODE=true` centralizes prototype behavior. `AI_PROVIDER=mock` needs no external dependency; `AI_PROVIDER=openai` requires server-side `OPENAI_API_KEY` and `OPENAI_MODEL`. Invalid critical configuration stops startup. `backend/.env.production.example` contains names only—never commit real secrets.

## Database setup

### SQLite development

Use `DB_CLIENT=sqlite` and `DATABASE_PATH=./data/cybershield.db`. Migrations 1–7 preserve the Phase 1–9 schema; migration 8 adds safe list-query indexes. Conventional tests use `:memory:` and never target development data.

### PostgreSQL

Set `DB_CLIENT=postgres` and `DATABASE_URL`, then run:

```bash
npm run db:migrate
npm run db:status
```

The shared pool has configurable size and query timeout. The PostgreSQL baseline contains all actual entities, restrictive foreign keys, indexes, UTC-aware timestamps, migration history, and a persistent session table.

### SQLite to PostgreSQL

After applying PostgreSQL migrations:

```bash
npm run db:migrate:postgres -- --dry-run
npm run db:migrate:postgres
```

The explicit utility preserves IDs and timestamps, copies in dependency order, skips conflicts, compares counts, and never modifies or deletes SQLite.

## Testing

```bash
npm run test:unit
npm run test:integration
npm run test:security
npm run test:coverage
npm run lint
npm run verify
```

Vitest/Supertest use an in-memory database. Existing deep suites remain for evidence, admin/audit, notifications, suspicious reports, and content privacy.

## Docker

Copy `.env.docker.example` to local `.env`, set the public HTTPS origin and replace every secret, then run `docker compose up --build`. The feature-frozen hackathon profile runs one Node instance with a persistent SQLite/evidence volume because the current repositories are SQLite-backed. The Node 22 image installs production dependencies, runs non-root, and excludes secrets, uploads, backups, logs, host modules, and Git data.

The frontend and API share one origin and frontend requests use the single relative `/api/v1` base. No production-visible frontend code depends on localhost. OpenAI mode is enabled only by setting `AI_PROVIDER=openai` and a server-side key.

Submission materials are in [docs/SUBMISSION_PACKAGE.md](docs/SUBMISSION_PACKAGE.md), and final external checks are tracked in [SUBMISSION_CHECKLIST.md](SUBMISSION_CHECKLIST.md).

## Backup and restore

Run `npm run db:backup`. PostgreSQL delegates to `pg_dump`. See [Backup and restore](docs/BACKUP_AND_RESTORE.md).

## Performance

With a local server running, `npm run perf:test` records requests/second, average/p95 latency, timeouts, errors, and non-2xx responses for harmless GET endpoints. Results are local observations, not production SLAs.

## Security

Helmet CSP/security headers, strict origins, HttpOnly sessions, validated inputs, parameterized queries, ownership/role checks, private caching, upload validation, redacted structured logs, bounded bodies/pagination, and rate limits are defense layers. Review [Security](docs/SECURITY.md) and the [deployment checklist](docs/DEPLOYMENT_CHECKLIST.md).

## Known limitations and deployment readiness

- Demo OTP is synthetic authentication for judging, not production identity verification.
- Local evidence storage is unsuitable for ephemeral hosting and requires a persistent volume or future object-storage provider.
- Real malware scanning is not implemented.
- The hackathon deployment profile is single-instance. Sessions are process-local and are cleared by a restart.
- CyberShield does not submit reports, register an FIR, notify authorities, recover money, identify suspects, or access official databases.
- OpenAI mode requires network access, a valid API key, model access and budget; the complete journey remains usable through manual selection when it is unavailable.
- Runtime complaint repositories remain SQLite-backed in the current prototype; PostgreSQL migration/operational assets exist, but a complete PostgreSQL repository adapter still requires implementation and end-to-end validation.
- Serious hosting still requires an independent threat model, privacy/retention review, operational ownership, restore drills, monitoring, and penetration testing.

CyberShield must never be presented as a real or official cybercrime reporting authority.
