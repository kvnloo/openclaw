# Chunk 9 — streaming-partial staleness + roster subscription fan-out audit

All surfaces read-only on openclaw main (checked 2026-09-25). Both defects classes NEGATIVE.

## 1. Chat streaming-partial staleness — NEGATIVE

Surfaces: ui/src/pages/chat/chat-history-stream.ts (applyHistoryRun), chat-history-hydration.ts, chat-types.ts, stream-reconciliation.ts, stream-causal-boundary.ts, chat-pane-discussion.ts.

Fences found:
- mergeInFlightAssistantText (chat-history-stream.ts): on divergence the local cumulative live buffer wins; a lagging history snapshot cannot rewind already-streamed text.
- Segment ingestion gated on state.chatRunId === inFlightRunId; pre-reconnect runIds are dropped at the applyHistoryRun gate.
- advanceAccumulatedStreamText accepts only prefix-extending text; a non-extending standalone preamble never becomes the cumulative baseline (documented in code comment).
- Hydration reset path: pruneHistoryReplacedStreamSegments + historyReplacedVisibleStream + rolloverChatStream; history loads carry an isCurrent() staleness check (recordTiming "stale" on mismatch).
- Reconnect probes generation-fenced (chat-pane-discussion.ts): a stale probe result never overwrites the new connection's cache, and a reconnected probe re-fires to get a fresh answer.
- stream-reconciliation.test.ts holds 30+ cases: causal-interval segment reconciliation, steer boundaries, interrupted-run fallbacks, keyed-preamble materialization.

No streaming-partial staleness defect. The subsystem is heavily fenced and tested.

## 2. Roster subscription fan-out under reconnect — NEGATIVE

Surfaces: ui/src/lib/agents/roster-activity-store.ts, session-event-subscription.ts, session-event-refresh-coordinator.

Fences found:
- createSessionEventSubscriptionOwner is idempotent per (client, epoch): ensure() early-returns when the same client+epoch is confirmed; a pending in-flight attempt is shared, not duplicated.
- reset() (called on every lifecycle transition via applyGateway) bumps the generation, clears confirmed, and clears retry timers — with the comment "a retired connection must never revive an observer on its replacement".
- Reconnect -> exactly one fresh ensure() from refresh(); not one per consumer.
- Visibility gating: syncPageActivity revokes on document-hidden; only one queued deferred per active cycle; refresh() reuses the same queued completion.

No duplicate-subscribe fan-out defect under reconnect.

## 3. #158013 watch (read-only)

Still open at head 7065ca24d8d9c9eac19af7e4976ec448665b35dc, updated 2026-09-25T08:10:23Z. 2 comments, both clawsweeper[bot] (08:03, 08:10 UTC). No human maintainer reply -> no revision. Chunk 2's proof branch stands.
