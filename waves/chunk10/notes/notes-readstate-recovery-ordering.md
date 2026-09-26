# Wave C chunk 10 — read-state edges in retained sessions + outbox recovery ordering under reconnect (audit)

Audited against kvnloo/openclaw fork main (dfbf998e8e6f tree, read-only). Both hunts NEGATIVE. No code changes.

## Hunt 1 — message-visibility / read-state edge cases in retained sessions: NEGATIVE

Surfaces: ui/src/pages/chat/chat-pane-base.ts, chat-pane-context.ts, chat-pane-session.ts,
chat-pane-retained-presentation.ts, chat-state-route.ts, ui/src/lib/sessions/unread.ts,
src/gateway/server-methods/session-unread-ack.ts, src/gateway/sessions-patch.ts.

Verified fences (chunk 8's audit stands; this pass went deeper into retained-pane specifics):

- Guard key alignment: every markSessionRead call passes `selectedChatSessionRow(state)`, which
  finds the row matching `state.sessionKey`; the SessionUnreadPatchGuard is keyed on the same
  `state.sessionKey`. No cross-session latch leakage. The retained-pane preview case
  ("route ownership settles after retained-pane preview") resolves through the same selector.
- Re-presentation ordering: `presentedChanged(true)` in chat-pane-retained-presentation.ts calls
  `unreadPatchGuard.beginActivation(state.sessionKey)` BEFORE `markSessionRead(...)` — the
  episode resets atomically with the ack decision; a stale row cannot wedge the latch for the
  new episode because the marker is re-observed on the same fresh row.
- Hidden-tab deferred hydration: chat-pane-session.ts gates the deferred path on
  `this.presented && document.visibilityState !== "hidden"`; markSessionRead after hydration
  commit only happens when the tab is visible.
- Server CAS (src/gateway/server-methods/session-unread-ack.ts): `expectedMarkedUnreadAt` makes
  two-tab ack races idempotent; stale marker -> no apply, no clobber. Manual-unread markers are
  monotonic (`Math.max(now, prev+1)`), auto-unread episodes carry no marker (derived from
  lastActivityAt > lastReadAt).

Observation (not a defect): the presented-gate in chat-pane-context.ts (`if (this.presented)`)
is route-ownership, not tab visibility — a presented pane in a *hidden tab* will ack unread on
session-list updates. This is self-consistent: returning to the tab hydrates the transcript, so
the activity is visible; the ack never hides anything the transcript wouldn't show. Deliberate
route-level semantics; not touched.

## Hunt 2 — outbox recovery ordering under reconnect: NEGATIVE

Surfaces: ui/src/lib/chat/outbox-recovery.ts, ui/src/pages/chat/chat-outbox-drain.ts,
chat-send-actions.ts.

Verified fences:

1. Recovery-restored items NEVER auto-flush. restoreChatOutboxRecovery() marks every restored
   queue item "failed"/"unconfirmed" with "Recovered message. Review this destination and retry
   only if it did not arrive." The drain loop's head selection skips `sendState === "failed"`
   rows unless the row carries a fresh manual-retry admission token. Ordering is operator-driven,
   not reconnect-driven — the dangerous auto-flush-after-reconnect shape does not exist.
2. Drain lanes are per-client: `storedChatOutboxLanes` is keyed by client instance, so a reconnect
   (new client) starts a fresh lane map; the orphaned old lane's loop re-checks
   `host.connected && host.client === client && host.connectionEpoch === connectionEpoch` after
   every await. A send started on epoch N cannot complete into epoch N+1's queue.
3. Idle reconciliation requires positive delivery proof: `reconcileStoredChatOutboxHead()` reads
   stored chat history to retire delivered messages; "Passive unknown sends need positive delivery
   proof; only an explicit retry may continue through idle reconciliation to the same idempotency
   key." A live send on the current connection blocks parking ("Elapsed time cannot turn a
   current-connection send into reconnect uncertainty"); version drift is caught by
   `sameQueuedDeliveryVersion`.
4. Uncertain slash-command dispatch installs a durable FIFO barrier: the successor row is marked
   "unconfirmed" with UNCERTAIN_CLEAR_SUCCESSOR_ERROR and the lane blocks until manual review.
   The claimed clear row is the reload-safe barrier.
5. FIFO is preserved except fresh active-run sends, which bypass older rows BY DESIGN (a live
   steer/interrupt must not wait behind a parked row).

No ordering defect: every reconnect-adjacent mutation path is fenced by client identity,
connection epoch, delivery version, and explicit operator admission.
