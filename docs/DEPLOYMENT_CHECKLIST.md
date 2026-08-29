# Deployment checklist

- [ ] Demo disclaimer remains clearly visible
- [ ] Production PostgreSQL configured and migrated
- [ ] Independent strong session and identifier-hash secrets generated
- [ ] HTTPS enabled at the trusted proxy
- [ ] Secure HttpOnly cookies confirmed
- [ ] Exact CORS origins and proxy-hop count configured
- [ ] Development OTP absent; authentication disabled until a real provider exists
- [ ] Email provider configured or intentionally disabled
- [ ] Backup schedule and test restore completed
- [ ] Evidence uses an encrypted persistent volume
- [ ] Retention and incident-response policies approved
- [ ] Rate limits and JSON-log collection reviewed
- [ ] Liveness/readiness, tests, and CI pass
- [ ] Dependency audit reviewed without forced upgrades
- [ ] Container runs as non-root and handles SIGTERM
- [ ] CSP, origin, IDOR, upload, XSS, and injection regressions pass
- [ ] Local evidence and absent malware-scanning limitations accepted
- [ ] Project is not presented as a government, police, bank, or official service
