# Wave C chunk 6 — chat outbox + gateway lifecycle audit (research notes, fork-only)

All-negative audit, recorded honestly. Two defect classes checked against current main:

1. **Chat outbox CAS contention under multi-tab** — per-row optimistic concurrency
   (draftRevision fencing, expectedDraftRevision compare, queueItemVersionMatches,
   post-write read-back verification). Same-generation concurrent edits resolve
   last-writer-wins by design; stale-pane retries are fenced out. No defect.
2. **Gateway connection-lifecycle edge cases** — generation-gated protocol client,
   wall-clock tick watch (no background-tab storm), per-epoch device-token retry
   budget. One minor observation: indefinite `waitUpgrade` during scope upgrade can
   orphan a server-side approval if a reconnect lands mid-wait (UX papercut, no
   data corruption). Not touched.
3. **#158013 watch** — still open, no human maintainer reply, no revision.

No defects found; no code changes. These notes are the research record.
