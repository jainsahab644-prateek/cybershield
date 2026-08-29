# CyberShield Submission Checklist

- [x] Public URL opens
- [x] HTTPS works
- [x] Homepage works
- [x] AI assistant works
- [x] Manual AI fallback works
- [x] Complaint form works
- [x] Evidence works
- [x] Review works
- [x] Complaint submits
- [x] Reference ID works
- [x] Tracking works
- [x] Chatbot works
- [x] Learning Corner works
- [x] Initiatives work
- [x] Mobile tested
- [x] Slow network tested
- [x] Accessibility checked
- [x] No major console errors
- [x] No major backend errors
- [x] No exposed secrets
- [x] No misleading government claims
- [x] Summary under 250 words
- [x] Video under 2 minutes
- [x] All public links tested

---

## Detailed QA Verification Summary

### Citizen Journey & Form
- [x] Homepage → Report Incident → AI Suggestion → Guided Form → Optional Evidence → Review → Submit → Reference ID → Track Complaint works end-to-end.
- [x] Edit button on review screen preserves all state.
- [x] Manual category override works cleanly.
- [x] AI fallback handles OpenAI unavailability gracefully without blocking form completion.

### Security & Privacy
- [x] `OPENAI_API_KEY`, `SESSION_SECRET`, and `DATABASE_URL` stored strictly on server.
- [x] Evidence storage directory (`private_uploads`) is not publicly exposed.
- [x] Admin endpoints `/api/v1/admin/*` require role authentication (401/403 enforced).
- [x] User isolation verified: User B receives 404 when accessing User A's complaints or evidence.
- [x] Stored XSS and SQL injection inputs fail harmlessly with sanitization/parameterization.

### Chatbot & AI Assistance
- [x] Incident assistance, evidence advice, phishing guidance, and complaint tracking work.
- [x] Safety rails reject hacking instructions, privacy leaks, and legal guilt determinations.
- [x] AI fallback messages fail gracefully when OpenAI is offline.

### Copywriting & Disclaimer Alignment
- [x] Non-official disclosure present without spamming "demo / mock / prototype" terms in citizen UI.
- [x] No misleading claims of FIR registration, police notification, or official government case assignment.
