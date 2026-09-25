# Wave C chunk 7 — websocket gap recovery + session-list pagination audit

Both defect classes came back NEGATIVE (defended by design). No code changes. Nothing touched upstream.

## Item 1 — websocket message-ordering under reconnect: NEGATIVE

- Intra-generation ordering is guarded: `packages/gateway-client/src/protocol-client.ts`
  tracks `seq` per frame; a jump (`seq > lastSeq + 1`) fires `onGap` instead of
  applying out-of-order state.
- The gap handler in `ui/src/app/gateway-store.ts` does a FULL RECONNECT, not
  selective replay. There is no event-level catch-up: the connect plan carries no
  `lastSeq`/resume token, and the protocol client resets `lastSeq` on each new
  generation ("Outer event sequences belong to one WebSocket generation").
- Recovery after reconnect is state-level, not event-level: hello replaces the
  identity snapshot, managed lists invalidate + refetch, and per-generation gating
  (socket, generation) prevents any frame from a retired socket being dispatched.
- So events missed during the drop window are permanently missed *as events* — the
  UI reconciles by re-reading authoritative state instead. This is a coherent
  design choice (state > events), not a defect. No ordering hole found.

## Item 2 — session-list pagination under rapid mutation: NEGATIVE

- `ui/src/lib/sessions/paged-session-rows.ts` is explicitly built for this hazard:
  keyed dedupe (`rowsByKey`), up to 4 retry passes when a pass grows but under-runs
  `expectedTotal`, `Math.max` on `totalCount` so a shrinking count can't erase a
  known roster, stall detection (`nextOffset <= offset`), and configurable
  `incompletePaginationError`. Code comments name the exact threat ("Gateway
  updatedAt sorting can move rows across offset windows between RPCs"), and
  `swarm-roster.test.ts` covers "restarts pagination when updated rows move across
  offset boundaries".
- Managed "window" mode clears per-page because the owner's refreshList already
  accumulates; the pass then completes against the accumulated snapshot. Coherent.
- Destructive paths defend too: delete-all-archived snapshots its options once and
  aborts on incomplete enumeration rather than deleting a partial set. Dashboard
  and sessions-page callers gate on `isCurrent()` so a mid-fetch mutation/nav
  switch drops the result instead of writing stale rows.

## Item 3 — #158013 watch

- Read-only check: still open at head `7065ca24d8d9`, updated 2026-09-25T08:10:23Z.
  Only the two clawsweeper[bot] comments (08:03, 08:10 UTC). No human maintainer
  reply → no revision. Chunk 2's proof branch stands.
