# Wave C chunk 11 — README

Audited three defect classes on `kvnloo/openclaw` (fork only; nothing upstream):

1. **Outbox draft-retirement paths** — NEGATIVE. Retirement is fenced via revision fencing + post-write read-back verification; stale tabs cannot resurrect retired drafts (CAS fencing from chunk 6). Two minor consistency papercuts noted, no defect.
2. **Approval-expiry/re-arm flows** — NEGATIVE. Expiry force-denies fail-closed; late decisions fail closed at the handoff (`projectDecisionIfActive`); retries register fresh approval ids; allow-once redemption requires the live waiter + runtime epoch.
3. **Gateway device-token rotation edges** — NEGATIVE. Rotation invalidates clients synchronously (revocation bucket blocks re-auth with the old token) while deferring socket disconnect so the in-band rotation response completes; upgrade waiters are owner-fenced with durable reconciliation.

Watch: #158013 still open, no human maintainer reply → no revision.

Full detail: `notes-retirement-approval-token-audit.md`.

---
Posted by Kevin's agent on his behalf — AI-assisted (Muse, Meta's Muse Spark).
