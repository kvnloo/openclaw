# Wave C chunk 19 — health-monitor restart edges, delivery-authority custody, webchat ACP lifecycle

Audited fork-only against kvnloo/openclaw (parent: fork main `dfbf998e8e6f`). Nothing touched upstream.

## 1. Channel health-monitor restart edges — FINDING (patch candidate)

**Surface:** `src/gateway/channel-health-monitor.ts` (`runCheckWork` restart path), `src/gateway/server-channels.ts`
(`startChannelProcessOwned`, `manuallyStopped` set).

**The race:** the monitor's restart calls `channelManager.startChannel(channelId, accountId)` with **no opts**
(`channel-health-monitor.ts`, restart path), so `preserveManualStop` defaults to `false`. In
`startChannelProcessOwned` (`server-channels.ts` ~L616-618):

```ts
if (!preserveManualStop && !store.stops.has(id)) {
  manuallyStopped.delete(rKey);
}
```

If an operator manually stops the channel **inside the monitor's stop→start window** (the `await stopChannel(...)`
can take seconds during provider teardown), the manual stop sets `manuallyStopped` — and the monitor's subsequent
start silently **clears the flag** and restarts the channel. The operator's explicit stop intent is erased, with no
audit-ledger entry (see chunk-15 observation: channel start/stop writes nothing to the ledger).

**Why this looks unintended:** every sibling restart path honors the flag —
- timed-out recovery-stop continuation passes `{ preserveManualStop: true }` (`server-channels.ts` ~L1049);
- supervisor auto-restart passes `{ preserveRestartAttempts: true, preserveManualStop: true }` (~L1091) and
  re-checks `manuallyStopped.has(rKey)` after the backoff sleep (~L1086), aborting with `reason: "manual-stop"`;
- start preparation re-checks the flag after awaits (~L746, L829, L870, L898, L930, L1012) and skips with
  `reason: "manual-stop"`.

The monitor's restart is the only path that clears a flag set *after* its own loop-time `isManuallyStopped` check
(`channel-health-monitor.ts` loop gate) — a genuine TOCTOU. If the flag were set before the loop check, the monitor
skips the account entirely; so any flag present at `startChannel` time arrived during the window and should win.

**Proposed fix (one line):**

```ts
await channelManager.startChannel(channelId, accountId, { preserveManualStop: true });
```

`startChannel` accepts `opts?: StartChannelOptions` (`server-channels.ts` ~L239), so this is type-valid. With the
flag honored, a window-landed manual stop makes the start skip with `reason: "manual-stop"` instead of resurrecting
the channel.

**Status:** recorded, not patched — no node_modules in this scratch checkout, so the TS suite could not run to
prove it. Recommend a follow-up chunk with test proof (red-on-base: flag set mid-window → start skips).

## 2. Delivery-authority custody paths — NEGATIVE

**Surface:** `src/agents/command/delivery-authority.ts`, `delivery.ts` (final handoff ~L790-830),
`src/infra/outbound/deliver-channel.ts` (`dispatchToAdapter`), `deliver-queue-execute.ts` (`onDirectAdapterHandoff`).

**Fences found:**
- `createAgentCommandDeliveryGuard` wraps `assertDeliveryCurrent` and converts custody loss into
  `PlatformMessageNotDispatchedError` with `retryable: true` **only** for known restart-retirement custody transfers
  (restart abort reason + command-owner recovery reference); all other custody loss is non-retryable.
- The guard is wired as **both** `onPlatformSendDispatch` and `assertDirectAdapterHandoff` on the final durable send.
- `dispatchToAdapter` runs the final `assertOutboundHandoffCurrent(params.assertDirectAdapterHandoff)` in the **same
  synchronous call stack** as the adapter `send()` invocation, with an explicit comment: "An awaited callback leaves
  a microtask gap where custody can change after validation but before recipient-visible transport code runs." The
  TOCTOU is deliberately closed.
- `onDirectAdapterHandoff` additionally asserts `assertSessionWriterDeliveryAuthorized` for pending-final
  completions, plus `throwIfAborted` and generation `assertCurrent()` around the dispatch callback.
- `createRestartOnlyAbortSignal` forwards only restart-reason aborts into transport cancellation; plain aborts are
  enforced by the guard throwing at handoff, not by silently delivering.

**Verdict:** custody is fenced at dispatch time with no microtask gap; restart-only retry discipline is explicit.
No defect.

## 3. Webchat ACP lifecycle fences — NEGATIVE

**Surface:** `src/acp/control-plane/session-actor-queue.ts`, `manager.core.ts` (`withSessionActor`,
`#forceDiscardSessionRuntime`), `manager.turn-runner.ts`, `manager.runtime-handle-cache.ts`, `manager.utils.ts`.

**Fences found:**
- `SessionActorQueue` serializes per `(sessionKey, agentId)` actor lane (`acpSessionActorKey`); all webchat
  connections sharing a session go through one lane.
- `rotate()` (called by `#forceDiscardSessionRuntime`) retires the lane; outstanding ops keep the retired token and
  their `isCurrent()` flips false; queued-but-not-started ops throw "ACP session actor was superseded" at dequeue.
- `#forceDiscardSessionRuntime` asserts current first, rotates, aborts all accepted turns + the active turn, and
  `take()`s the cached runtime handle **synchronously** before backend cleanup — a racing ensure cannot resurrect it.
- `manager.turn-runner.ts` re-checks `isCurrentActor()` after awaits at ~17 sites (L133, L168, L279, L346, L375,
  L385, L395, L416, L444, L470, L482, L547, L564, L605, L624, L637) — superseded turns bail before side effects.
- `closeAll` (shutdown disposer) intentionally ignores `isCurrent` but still runs each close through its actor lane,
  so closes serialize behind in-flight work.
- `clearIfHandleMatches` only clears the cache when caller-owned identifiers match.

**Verdict:** epoch fencing is consistent across reset, reconnect, and shutdown; stale actors cannot act. No defect.

## #158013 watch (read-only)

Still open, head `7065ca24d8d9`, updated 2026-09-25T08:10:23Z, 2 comments (both clawsweeper[bot]), 0 review comments.
No human maintainer reply. No revision.
