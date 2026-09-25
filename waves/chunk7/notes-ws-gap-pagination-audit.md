# Chunk 7 evidence notes

## WS gap recovery — frame path (openclaw-main @ fork main)

`packages/gateway-client/src/protocol-client.ts`:
- `lastSeq: number | null`, reset to null per generation (line ~194).
- On each event frame: `seq` parsed; if `seq > lastSeq + 1` → `onGap({expected, received})`
  invoked; re-checks `isActive(socket, generation)` after the callback because gap
  recovery can retire the socket synchronously; `lastSeq = seq` only then.
- All handlers (`handleOpen/handleMessage/handleClose/error`) are bound to the
  generation captured at connect time; a replacement owner's frames never inherit
  a retired socket's listeners (snapshot-first dispatch + per-iteration
  `isActive` checks).

`ui/src/api/gateway.ts` `buildConnectPlan`: params carry minProtocol/maxProtocol,
client identity, role, scopes, device, capability flags — no resume cursor.

`ui/src/app/gateway-store.ts`: `onGap` sets "event gap detected … reconnecting" and
calls `connect()`. Reconnect → new `GatewayBrowserClient` → hello replaces
`hello`, `sessionKey`, presence; canvas lease re-bound. No replay of dropped
event seqs; reconciliation via refetch. Held: no defect.

## Session-list pagination — paths checked

- `ui/src/lib/sessions/paged-session-rows.ts` (83 lines): full pass-retry design,
  `seenOffsets` loop guard, `MAX_SESSION_LIST_PASSES = 4`.
- Callers: `child-session-data.ts` (window mode, refreshList append), `swarm-roster.ts`,
  `sessions-page.ts:789` (delete-all-archived), `dashboards-page.ts:134`.
- `sessions-page.ts` delete-all-archived: options snapshot per enumeration,
  stale-scope guards before and after the confirm dialog, abort-on-incomplete.
- Negative: rapid mutations are retried, not lost; stalled pagination throws.

## #158013

API read-only: open, head `7065ca24d8d9`, updated 2026-09-25T08:10:23Z,
comments: clawsweeper[bot] × 2. No action.
