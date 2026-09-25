# Wave C chunk 6 — audit notes: chat outbox multi-tab contention + gateway connection lifecycle

Audited against `~/workspace/scratch/openclaw-main` (current main, tarball fetch). Fork-only lane: no code changes, no upstream contact. All findings below are negative results unless marked otherwise.

## 1. Chat outbox CAS contention under multi-tab — NEGATIVE

**Files:** `ui/src/lib/chat/outbox-store.ts`, `outbox-store-draft-state.ts`, `outbox-store-projection.ts`, `outbox-recovery.ts`, `ui/src/pages/chat/composer-persistence.ts`.

The store's optimistic concurrency is per-row, not per-document, and every mutation path carries the same three-step shape: re-read, version-compare, write, verify.

- **Draft path** (`persistChatComposerState`, composer-persistence.ts:150+): `expectedDraftRevision` compare against the committed revision; `nextDraftRevision` monotonic per tab with `observeDraftRevision` syncing from stored reads; `rememberDraftAttempt` reserves every accepted attempt before touching storage so a newer failed edit/clear fences out older pane fallbacks; the write is verified by re-reading the row and comparing text/mentions/goalMode/replyTarget/revision.
- **Queue path** (`updateStoredChatComposerQueueItems`, enqueue paths): `queueItemVersionMatches(stored, expected, scope)` per item; post-write read-back asserts the queue state.
- **Recovery path** (`restoreChatOutboxRecovery`): re-captures the destination snapshot and JSON-compares it to the expected capture ("conflict" on drift) before the read-modify-write; post-write verifies the recovery row is gone and the session matches.
- **Projection cache** (`readProjectedOutboxStore`): invalidated by `storage` events and deleted on every canonical write; mutation paths reread rather than trusting it.

**Multi-tab semantics:** two tabs editing the same draft at the same generation resolve last-writer-wins — by design, and correct for drafts. The fencing exists to stop *stale* writes (an older pane retry, a resurrected evicted scope), not to serialize concurrent fresh edits: a pane whose `expectedDraftRevision` no longer matches the committed state gets `"conflict"` and does not write. Draft-only rows also retain the seen revision while the tab is alive so an evicted scope cannot be treated as revision zero.

**Verdict:** no contention defect. The outbox's multi-tab story is deliberately constructed; nothing to fix.

## 2. Gateway connection-lifecycle edge cases — NEGATIVE (+1 minor observation)

**Files:** `ui/src/lib/gateway-connection-lifecycle.ts`, `ui/src/api/gateway.ts` (`GatewayBrowserClient`), `packages/gateway-client/src/protocol-client.ts`, `packages/gateway-client/src/scope-upgrade.ts`.

- **Stale hello/message delivery across reconnects:** impossible by construction. The protocol client gates every socket callback — open, message, close, error — on `(socket, generation)` (`isActive`/`isConnectCurrent`). `handleConnectHello` in `gateway.ts` therefore only ever sees the current generation's hello. The synchronous hello handler writes `recovery.value`, `maxPayloadBytes`, tick watch, and `scopeUpgradeBinding`; the async tail (`resolveRecoveryScope`) re-checks `plan.generation !== this.recovery.generation || !this.client.connected` after its awaits before mutating anything.
- **Background-tab reconnect storm:** no. `needsWakeReconnect` is wall-clock based (`Date.now() - lastInboundActivityAtMs > 2 * tickIntervalMs`, default 60s), not timer-fidelity based. WebSocket inbound activity (including heartbeats) keeps updating `lastInboundActivityAtMs` even when `setInterval` is throttled, so only a genuinely silent socket triggers `forceReconnect`.
- **Device-token retry budget:** reset on each successful hello (`handleConnectHello`), consumed once per connection epoch on `AUTH_DEVICE_TOKEN_MISMATCH`. One retry per epoch is the intended shape; a flapping connection gets one retry per successful handshake, not unbounded retries.
- **Scope-upgrade reconnect:** `runUpgrade` stores the approved token via `tokenStore.store(...)` *then* calls `deps.reconnect()`; the post-reconnect connect plan reloads the stored token via `loadDeviceAuthToken`. The binding is re-created from the new hello's `plan.deviceIdentity`. Coherent.

**Minor observation (not a defect, not touched):** `runUpgrade` waits on `device.scopes.waitUpgrade` with `timeoutMs: null` — indefinite. If a reconnect lands mid-wait (e.g. tick timeout), the pending request is rejected ("gateway connection retired") and any server-side approval granted in that window is orphaned; the user must re-request the upgrade. No data corruption, no stuck state — UX papercut only. Recorded here; left alone.

## 3. #158013 watch — no change

Read-only check 2026-09-25 ~18:45 CDT: PR still open, head `7065ca24d8d9`, `updated_at` 2026-09-25T08:10:23Z, 2 comments (both clawsweeper[bot], 08:03/08:10 UTC). No human maintainer reply → no revision. Chunk 2's `muse/wave-c2-158013-proof` stands.

---
*Research notes only. Nothing posted upstream; fork branch holds these files as the record.*
