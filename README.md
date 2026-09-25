# Wave C chunk 5 — Control UI freshness audit (research notes, fork-only)

All-negative audit, recorded honestly. Three classes checked against current main:

1. **event-refresh-coordinator paths** — 5s debounce + adaptive 5–15s cooldown, tested pacing
   suite, hidden-page trailing invalidation, generation-guarded isCurrent. Fan-out bounded:
   managedLists keyed by normalized query share entries; scheduleEvent invalidates in place
   and only schedules the roster coordinator when the primary snapshot wasn't applied.
2. **Cross-tab snapshot invalidation + subscription resilience** — localStorage
   set-then-remove cross-tab trick with conservative malformed-payload handling; per-session
   revision map with pending-write cancellation on forget(); subscribe re-ensured on every
   load despite retryDelayMs null.
3. **#158013 watch** — still open, no human maintainer reply, no revision.

No defects found; no code changes. These notes are the research record.
