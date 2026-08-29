# CyberShield Hackathon Submission Package

## Live-link readiness

The application is container-ready and uses one public origin for frontend and API. A hosting target and public URL have not yet been supplied, so deployment, HTTPS, incognito, mobile-network, and public-console checks remain pending.

## Project summary — under 250 words

CyberShield is a hackathon prototype that simplifies the experience of reporting a cyber incident.

The problem is category confusion: people experiencing phishing, payment scams, impersonation, account compromise, online shopping fraud, or harassment may not know which complaint path fits or what information they should provide.

Instead of starting with technical categories, CyberShield lets a citizen describe what happened in plain language. An optional complaint assistant suggests a relevant category and subcategory, explains why it may fit, lists useful information, and warns against sharing credentials. The suggestion is advisory, and the citizen can always choose another path or continue manually if the assistant is unavailable.

The citizen then completes guided questions, reviews each section, submits a synthetic report, receives a demo reference ID, and tracks its mock status. The public reporting journey does not require an account.

Codex was used throughout implementation and refinement: frontend workflow, backend APIs, validation, persistence, accessibility, security checks, automated tests, browser debugging, and deployment preparation. An OpenAI model can power structured category suggestions when enabled.

Government submission, police processing, OTP delivery, official statuses, authority notifications, and evidence used for judging are intentionally mocked. The architecture separates these dependencies so approved services could replace them in a future authorized implementation.

## Two-minute video script

### 0:00–0:10 — Problem

Show the homepage. Say: “Reporting a cyber incident can be confusing when a citizen does not know which category fits or what information is required. CyberShield guides that decision in plain language.”

### 0:10–0:25 — Start the scenario

Click **Try This Scenario**, then **Help Me Choose**. Say: “A reviewer can start with this fictional electricity-disconnection payment-link message, or describe another incident in their own words.”

### 0:25–0:35 — Assistant

Show the suggestion. Say: “The assistant suggests a reporting path, explains why it may fit, lists useful information, and warns against sharing secrets. The citizen can override it.”

### 0:35–0:50 — Guided report

Move through prepared fictional fields, optional synthetic evidence, and the review page. Say: “Relevant questions are presented one step at a time, with plain-language validation and an edit-before-submit review.”

### 0:50–1:00 — Submit and track

Submit, show the reference ID, and open tracking. Say: “The report receives a synthetic CyberShield reference and a privacy-safe mock status.”

### 1:00–1:15 — Focused problem

Say: “The focused problem is category confusion and complicated reporting flows—not redesigning an official portal.”

### 1:15–1:30 — OpenAI

Say: “When enabled, an OpenAI model receives only a redacted incident description and returns validated structured category guidance. It does not determine guilt or make legal decisions.”

### 1:30–1:45 — Engineering and Codex

Say: “Codex was used to build and refine the vanilla JavaScript interface, Express APIs, SQLite persistence, validation, evidence handling, accessibility, security controls, and automated tests.”

### 1:45–1:58 — Mocks and scale

Say: “Government submission, police processing, OTP delivery, and official statuses are intentionally mocked. Their boundaries are separated so approved providers could replace them in an authorized implementation.” End on the prototype notice before 2:00.

## Exact OpenAI usage

- **Input:** the citizen’s incident description only, with likely secrets redacted server-side.
- **Task:** suggest one existing CyberShield category and subcategory.
- **Output:** structured category suggestion, confidence, short explanation, useful-information checklist, safety warning, and optional alternatives.
- **Controls:** server-only API key, bounded input, rate limit, timeout, strict JSON schema, Zod validation, `store: false`, safe text rendering, and manual fallback.
- **Citizen control:** suggestions are advisory and can always be changed.

## Exact Codex usage

Codex built and iteratively refined the multi-step citizen workflow; implemented Express routes, controllers, services, repositories, validation, and persistence; improved responsive and accessible UI; added security and privacy controls; created automated tests and documentation; reproduced live browser failures; and verified assistant success, uncertainty, fallback, submission, reference generation, and tracking.

## Working today

- Public reviewer-first homepage and prefilled demo scenario
- Mock or OpenAI-backed category assistant with manual fallback
- Plain-language multi-step reporting and validation
- Review and edit controls
- Anonymous synthetic complaint submission and unique reference generation
- Demo complaint tracking
- Optional authenticated synthetic evidence workflow
- Demo OTP authentication, user dashboard, notifications, learning content, suspicious reporting, admin workflow, and audit logs

## Mocked or synthetic

- Government and police submission or integration
- Official complaint IDs, statuses, case processing, and authority notifications
- OTP delivery and identity verification
- Contact details, evidence, complaints, and reviewer scenarios
- Assistant classifications when `AI_PROVIDER=mock`

## How it could scale

The prototype separates citizen UX from external authority dependencies. In an authorized implementation, mock identity verification, submission, notification, and storage providers could be replaced with approved services while preserving the simpler reporting experience.

## Known limitations

- No public deployment or URL has been configured yet.
- Live OpenAI mode requires a valid server-side key, model access, network access, and budget.
- The deployment profile is intentionally single-instance SQLite; PostgreSQL repository adapters are incomplete.
- Sessions are process-local and reset on restart.
- Local evidence storage needs a persistent volume and does not include malware scanning.
- Mobile, slow-network, incognito, HTTPS, public link, and public console tests must be repeated on the final deployed URL.
