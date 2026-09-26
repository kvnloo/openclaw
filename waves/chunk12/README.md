# Wave C chunk 12 — pairing + channel-transport audit (2026-09-25)

Fork-only audit notes (no code changes). All NEGATIVE except minor observations.

## 1. Gateway node-pairing flows — NEGATIVE
- Approve path serialized through the pairing worker; an admit gate refuses when a
  reconnect cleanup claim owns the pending revision (fail-closed). Handler maps the
  refusal to "unknown requestId" — slight misattribution, deliberate fail-closed.
- Live-session surface inheritance is generation-keyed: only the exact pairing
  identity + generation survives an approval; a later re-pair must reconnect.
  Wake state is invalidated on every approval.
- Auto-approve policy tightly bounded: fresh, scopeless, non-browser, role:node only,
  attributable client IP; loopback-trusted-proxy spoof path rejected.
- Silent-pairing prune double-guarded (pre-commit protected-device list + admit
  re-check at commit), so a reconnecting node cannot be pruned under itself.
- UX note: Control UI has no in-flight dedupe on approve — a double-click sends two
  RPCs and the second fails "unknown requestId" server-side. Server is authoritative.

## 2. Channel transport reconnect paths — NEGATIVE
- Concurrent starts of the same account deduped via the store.starting promise gate
  (reserved before the first await — no duplicate provider boots).
- Reload fence re-checks after every await: a start admitted before a plugin reload
  throws "retry after reload" instead of booting a stale plugin.
- Thaw-restart snapshots only running+listed accounts, skips manually-stopped,
  aborts on suspension, returns failed targets for deferred retry.
- Runtime snapshots serve fence snapshots during reload: Control UI never sees a
  half-published registry.

## 3. Control-UI channel message delivery — NEGATIVE
- Outcomes classified sent / suppressed / partial_failed / failed with sentBeforeError
  tracking; receipts committed only on sent/suppressed; send-failure cleanup logs
  without clobbering the original error.
- DM pairing approval notify failure is surfaced as `notification:"failed"` — never
  claimed as sent.
- Observation: `onCommitReceipt` is declared + invoked in send.ts but no caller
  passes it — a dead optional seam, harmless.

## 4. #158013 watch (read-only)
Still open at head 7065ca24d8d9 (updated 2026-09-25T08:10:23Z); 2 clawsweeper[bot]
comments, 0 review comments. No human maintainer reply. No revision.
