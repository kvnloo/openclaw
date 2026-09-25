# Freshness audit — negative results (2026-09-25)

## 1. event-refresh-coordinator (ui/src/lib/sessions/event-refresh-coordinator.ts)
- 5s debounce (SESSION_EVENT_REFRESH_DEBOUNCE_MS), adaptive cooldown
  `completed + min(15s, max(5s, 3*duration))`. Tested in
  event-refresh-coordinator.test.ts (pacing + hidden-page catch-up-once).
- `setActive(false, markDirty)` retains trailing invalidation (`queued ||= markDirty || timer !== 0`);
  `setActive(true)` arms immediately. Hidden pages don't lose events.
- `scheduleEvent` (session-roster-refresh.ts): invalidates managed lists in place;
  schedules the roster-level coordinator only when `!primarySnapshotApplied`.
- `managedLists` keyed by normalized query (session-primary-windows.ts); identical
  queries share one entry; warm-primary leases retired on invalidate.
- 7 coordinator instances own distinct scopes/queries. No duplicate-RPC defect.

## 2. Cross-tab snapshot invalidation (pages/chat/session-snapshot-invalidation-events.ts)
- setItem-then-removeItem broadcast; other tabs see the set event (newValue != null),
  ignore the remove. Malformed payloads retire all snapshots (conservative).

## 3. Snapshot store epoch guards (pages/chat/session-snapshot-store.ts)
- `forget()` bumps per-session revision AND deletes pending debounced writes —
  no stale-write resurrection. `flush()` captures pendingRevisions, re-checks at write.
- Global invalidations bump `snapshotStoreGeneration`; stale generations discarded.

## 4. Subscription resilience (lib/agents/roster-activity-store.ts)
- `retryDelayMs: () => null` is safe: `load()` re-runs `events.ensure(scope)` every
  refresh; generation guards stop retired connections reviving observers.

## 5. #158013 watch
- Open, head 7065ca24d8d9, updated 2026-09-25T08:10:23Z; only clawsweeper[bot]
  comments. No human maintainer reply → no revision.

Verdict: no staleness defect in any audited path. Defended by design.
