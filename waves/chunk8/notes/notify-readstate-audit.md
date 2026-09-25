# Notification freshness under event storms + read-state reconciliation across tabs

Audit of current openclaw main (source read-only; no branches touched except this research note). Chunk 8 of the wave-C rotation. All NEGATIVE — deliberately built, honestly recorded.

## 1. Control-UI notification freshness under event storms — NEGATIVE

Surface: `ui/src/lib/toast.ts` (`OpenClawToastHost` + `showToast`).

### Replacement semantics
- `show(options)`: if `options.fifo && this.toast` → pushed to `toastQueue`; otherwise the active toast is finished with reason `"replaced"` (caller gets `onDismiss("replaced")`) and the new toast takes over.
- `finishDismiss`: reason `"disconnected"` drains the whole fifo queue (each gets `onDismiss("disconnected")`) — deliberate. Any other non-`"replaced"` reason shifts the next queued fifo item and shows it. `"replaced"` preserves the queue.
- Startup race covered: `showToast` before the host exists holds the latest in `queuedToast`; `connectedCallback` shows it.

### Storm analysis
- Non-fifo storm: each toast replaces the previous; intermediate notifications are lost to the user but callers are told (`"replaced"`). No escalation path for a transient important state replaced before reading — by design (single-toast surface).
- Fifo storm: queue is **unbounded** — no cap, no coalescing, no dedup. The two producers are background-session completion notices (`background-session-notice.ts:124`, `palette-session-draft.ts:489`), so a swarm-scale burst queues N×6s toasts. Hover pauses the dismiss timer, stretching it further.
- Freshness at dequeue: `finishDismiss` shows the next queued item verbatim, no TTL/staleness check. Not a defect here because the messages are historical completion facts (name + status), and the `onAction` guards with `params.isCurrentOwner()` before navigating. No live-state claims go stale.
- Verdict: no freshness defect; defended by design. Observations (unbounded queue, no dedup) are minor and untouched.

## 2. Message-visibility / read-state reconciliation across tabs — NEGATIVE

Layers: `ui/src/lib/sessions/unread.ts` (SessionUnreadPatchGuard), `ui/src/pages/chat/chat-pane-session.ts` (markSessionRead), `ui/src/pages/chat/chat-pane-context.ts` (presented-pane gate), `src/shared/session-unread.ts` (deriveSessionUnread), `src/gateway/server-methods/session-unread-ack.ts` (server CAS), `ui/src/app/control-ui-favicon-status.runtime.ts` (favicon).

### Client guard
- Only the pane the user is actually looking at may clear unread: `applySelectedSessionProjection` calls `markSessionRead` only when `this.presented` (chat-pane-context.ts:252-255). Hidden retained panes never clear.
- `SessionUnreadPatchGuard`: patches at most once per unread episode; `beginActivation(sessionKey)` resets the latch whenever a pane is (re-)presented; permanent rejections (INVALID_REQUEST/FORBIDDEN/APPROVAL_NOT_FOUND) latch the episode while transient failures retry; optimistic local reads keep the latch until the gateway confirms (`unread=false` + marker observed → no duplicate dispatch).
- Manual-toggle preservation: a `markedUnreadAt` arriving after the activation was observed is treated as the user's explicit "mark unread" (chat-pane-session-menu.ts `toggle-unread`) and is NOT auto-cleared; it is acknowledged on a later activation. Tested in `unread.test.ts`.

### Marker semantics (verified, not assumed)
- `deriveSessionUnread`: unread ⇔ `markedUnreadAt !== undefined` OR `max(lastInteractionAt, lastActivityAt) > lastReadAt`. Auto-unread episodes from new activity carry **no marker** — the marker is manual-toggle-only. So re-acknowledgement across episodes works: confirmed read resets the latch, new activity re-fires with no marker.
- (Initial trace error corrected: I first assumed new activity minted fresh markers, which would have blocked re-acknowledgement. The shared derivation proves it does not.)

### Multi-tab races
- Two tabs, same session, both presented, new activity: each tab owns its own guard instance; both may send `sessions.patch {unread:false, expectedMarkedUnreadAt}`. Server `resolveSessionUnreadAck`: marker mismatch → `stale` (no apply); matching markers clear idempotently. No clobbering; the second clear is a harmless no-op since the goal state was already reached.
- Tab A marks read while tab B is hidden: tab B's roster gets the server-published row; tab B's guard sees `unread=false` with a marker → refuses to duplicate-patch. When tab B is presented, `beginActivation` resets and it re-evaluates fresh.
- Read-only navigation (`sharingRole === "viewer"`, no mutation access) stays silent and does not latch the retry guard — comment says so explicitly.

### Favicon
- `unread` is a local boolean; set when a completion lands while `document.visibilityState === "hidden"`; cleared whenever the document becomes visible. Per-tab presentation signal; cross-tab staleness is self-healing on visibility.

Verdict: no reconciliation defect; the unread episode model is well-built and tested.

## 3. #158013 watch (read-only)
- Still open; 2 comments, both clawsweeper[bot] (08:03, 08:10 UTC); updated 2026-09-25T08:10:23Z. No human maintainer reply → no revision. Chunk 2's proof branch (`muse/wave-c2-158013-proof`) stands.

---
*Authored with AI assistance (Muse, Meta's Muse Spark) under the contributor's direction, as part of a continuous OSS research loop. Findings are audit notes only; no code changed on any upstream repository.*
