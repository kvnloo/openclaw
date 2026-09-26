# Wave C chunk 11 — audit notes

Fork-only audit (no code changes; no upstream contact). Branch: `muse/wave-c11-retirement-approval-token-audit` on `kvnloo/openclaw`.

## 1. Outbox draft-retirement paths — NEGATIVE

Surface: `ui/src/lib/chat/outbox-store-retirement.ts` (`retireStoredComposerDrafts`) + `outbox-store-draft-state.ts`.

- Retirement fences via `nextDraftRevision(max(latestAttempt, retireBeforeRevision))` + `rememberDraftAttempt`; post-write read-back verification requires `draftRevision===written && !draft && !queue.length`, else it reports `storageFailed`.
- A stale reconnecting tab cannot resurrect a retired draft — persist paths use `expectedDraftRevision` CAS (chunk 6), so retired sessions (high draftRevision, draft cleared) stay cleared.
- Minor observations (not defects): empty-key targets are dropped silently in the no-storage branch but cause an early-return + `storageFailed: true` mid-loop after earlier targets already moved their attempt markers. The early return also skips persisting earlier targets' store updates for that call, leaving one stale draft visible one extra tick. Both are consistency papercuts in the failure path, not user-data defects.

## 2. Approval-expiry/re-arm flows — NEGATIVE

Surface: `src/gateway/exec-approval-manager.ts`, `src/gateway/server-methods/approval-shared.ts`, `src/agents/bash-tools.exec-approval-request.ts`, `src/agents/harness/native-hook-relay-permissions.ts`.

- Expiry flows through `expire()` → `forceDenyDetailed(status="expired")`, fail-closed; `handleApprovalWaitDecision` answers "approval expired or not found" on missing/stale records.
- Late-arriving decisions fail closed at the handoff: `projectDecisionIfActive` returns `null` and schedules authority closure when the record is no longer runtime-active; "Durable approval truth is not executable authority."
- Every retry registers a FRESH `crypto.randomUUID()` approval id; two-phase registration guarantees the id is registered server-side before `exec` returns `approval-pending`, so `/approve` can never race an unregistered id.
- Expired follow-up handoffs are TTL-pruned (`pruneExpiredExecApprovalFollowupRuntimeHandoffs`); relay `allow-always` cache fail-closes on read (`expiresAtMs <= now` → delete → false) and prunes lazily with a max-size bound.
- Allow-once redemption requires the live waiter entry + runtime epoch (`consumeAllowOnce`).

## 3. Gateway device-token rotation edges — NEGATIVE

Surface: `src/gateway/device-token-client-lifecycle.ts` (`retireDeviceTokenClients`), `src/gateway/server-request-context.ts` (`invalidate`/`disconnectClientsForDevice`), `src/gateway/device-revocation.ts`, `src/gateway/device-scope-upgrade.ts` (`ScopeUpgradeCoordinator`).

- Rotation/revocation calls `retireDeviceTokenClients` in the same turn as token replacement (callbacks `onTokensReplaced` / `onDeviceTokensReplaced` in both the pairing path and the server-lifecycle path).
- Invalidation is SYNCHRONOUS — every matching client is flagged `gatewayClient.invalidated` + `invalidatedReason`, node projections are retired, and `invalidateGatewayDeviceRevocation` revokes the per-device revocation bucket (role-filtered), so the old token cannot re-auth in the gap. Socket disconnect is deferred via `queueMicrotask` so the in-band rotation response completes.
- Already-buffered requests fail authorization because the invalidated flag is checked at the policy layer.
- `ScopeUpgradeCoordinator` fences upgrade waiters by `sameOwner(deviceId + publicKey)`, expiry + 15s terminal grace, and durable pairing reconciliation (`initialToken`/`approvedAtMs` evidence), so a rotated token mid-upgrade cannot be mis-attributed to the wrong device.

## 4. #158013 watch (read-only)

Still open at head `7065ca24d8d9`, updated 2026-09-25T08:10:23Z; 2 comments (both clawsweeper[bot]), 0 review comments. No human maintainer reply → no revision. Chunk 2's proof branch stands.

---
Posted by Kevin's agent on his behalf — AI-assisted (Muse, Meta's Muse Spark).
