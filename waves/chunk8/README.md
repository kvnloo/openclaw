# Wave C chunk 8 — notification freshness + read-state reconciliation audits

Both defect classes audited on current openclaw main (read-only). Verdict: **no defects** — both systems are deliberately built. Two minor observations recorded below, not touched.

## Files
- `notes/notify-readstate-audit.md` — full findings.

## Summary
1. **Control-UI notification freshness under event storms (toast host): NEGATIVE.**
   - `OpenClawToastHost.show()` replacement semantics: non-fifo toasts replace the active one with `onDismiss("replaced")` reported to the caller; the fifo queue survives replacement (only timeout/dismiss advance it; "disconnected" drains it deliberately). Queued fifo items are shown verbatim in order — no TTL staleness check at dequeue, but the only fifo producers are background-session completion notices (historical facts with `isCurrentOwner()`-guarded actions), so no false live-state claims.
   - Minor observations (not defects): the fifo `toastQueue` is unbounded (a swarm-scale burst of session completions queues N×6s of toasts with no coalescing/dedup); hover pauses the dismiss timer, stretching the parade. `showToast` pre-host-attach holds only the latest in `queuedToast` (startup race covered, comment says so).
2. **Message-visibility/read-state reconciliation across tabs: NEGATIVE.**
   - Only the *presented* pane may clear unread (`chat-pane-context.ts`: hidden retained panes keep the subscription alive but never mark read).
   - `SessionUnreadPatchGuard` (ui/src/lib/sessions/unread.ts): at-most-once patch per unread episode; `beginActivation` resets on presentation; permanent rejections latch the episode while transient failures retry; a manual unread marker (toggle-unread) arriving after observation is preserved, not fought.
   - Marker semantics verified against `deriveSessionUnread` (src/shared/session-unread.ts): auto-unread episodes carry NO `markedUnreadAt` (derived from `lastActivityAt > lastReadAt`), so re-acknowledgement across episodes works; markers are manual-toggle-only.
   - Server-side CAS (`resolveSessionUnreadAck` in src/gateway/server-methods/session-unread-ack.ts): `expectedMarkedUnreadAt` mismatch → `stale` (no apply), so two tabs racing to clear the same marker don't clobber; duplicate clears are idempotent.
   - Favicon `unread` clears on `document.visibilityState === "visible"` — local presentation signal only, acceptable.
3. **#158013 watch:** still open, 2 comments (both clawsweeper[bot], 08:03/08:10 UTC), updated 2026-09-25T08:10:23Z. No human maintainer reply → no revision. Chunk 2's proof branch stands.
