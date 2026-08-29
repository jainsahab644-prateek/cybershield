# Security model

> **Demo / Educational Project — Not an official government website.**

- Authentication uses a short-lived, hashed, single-use development OTP and server session. It is not production authentication.
- Ownership comes from the session. Cross-user complaint/evidence/notification resources return privacy-safe 404 responses. Admin APIs require the current database role.
- Cookies are HttpOnly, SameSite=Lax, and Secure in production.
- Credentialed CORS uses configured origins; state-changing requests reject an unexpected `Origin`.
- CSP forbids inline/evaluated scripts. Untrusted values use text nodes; controlled Markdown permits constrained markup and HTTP(S) links.
- Repositories use bound parameters and fixed sort mappings. Injection-like literal strings are regression tested.
- Uploads have count/size, extension/MIME/signature, randomized-name, private-cache, ownership, and path-confinement checks. Real malware scanning is not implemented.
- Rate limits for general, OTP, complaint, evidence, suspicious, and admin routes are centralized.
- Production requires independent session and identifier-hash secrets. Logs redact cookies, authorization, OTP/password-like fields, keys, and database URLs.
- Privileged changes create append-only audit records without credentials, bodies, sessions, or evidence contents.
- Public tracking returns only minimal status data. Private APIs are `private, no-store`; learning content has a short cache.

Never enter real identity documents, banking credentials, OTPs, PINs, CVVs, private keys, or official reports.
