# Wave C chunk 14 — avatar route, channel detail staleness, media resume audit

Fork-only audit (kvnloo/openclaw). Nothing touched upstream.

## Item 1 — assistant-avatar HTTP route — NEGATIVE
- Handler: `handleControlUiAvatarRequest` (src/gateway/control-ui.ts).
- Route parse is exact-encoded; agentId segment validated `/^[a-z0-9][a-z0-9_-]{0,63}$/i` — no traversal.
- Auth first: `authorizeControlUiReadRequestOrReply`, plus `assertCurrent()` after every await.
- fd ownership: `openGatewayAssistantAvatar` transfers the descriptor; the handler closes it in
  `finally` on every path — no descriptor leak (the `?v` thumbnail branch included).
- Thumbnail cache-busting: `v === revision(source)` -> `private, max-age=31536000, immutable`;
  mismatched `v` -> `private, no-cache`. `vary: Authorization, Cookie` on the thumbnail branch.
- Local avatar files: realpath containment inside the agent workspace (`resolveLocalAgentAvatarPath`),
  extension allowlist, 512KB cap, hardlink rejection, pinned-descriptor reads.
- Observation (not a defect): `?meta=1` returns the raw remote avatar URL for `remote`-kind avatars —
  authenticated endpoint, the operator's own config value. Not touched.

## Item 2 — channel detail panel staleness — OBSERVATION (freshness gap, not a defect)
- `loadChannels` (ui/src/lib/channels/index.ts) is seq-fenced (client identity + refreshSeq) and
  resets on client/connection change — no stale-write defect.
- But the channel status list is pull-only: initial load on connect + manual Probe/Refresh.
  No poll (only pairing has the 30s poll), no gateway `channels.changed` event — none exists
  server-side (checked server-methods; no such event is published).
- Consequence: server-side state changes (account drops, restarts) leave the detail panel stale
  until manual refresh. A cheap `probe:false` poll is feasible server-side (only the `probe:true`
  path runs the expensive per-account plugin hooks), but no such poll exists. Recorded as a
  freshness gap; the UI never claims live status, so not a defect.

## Item 3 — webchat media attachment resume paths — NEGATIVE
- Range handling in src/gateway/http-byte-range.ts is RFC 9110-shaped: suffix ranges supported,
  end clamped to size-1, `start >= size` -> 416 with `bytes */size`; multipart ranges deliberately
  unsupported -> full 200 (never a 500).
- Validator-before-range ordering: If-None-Match supersedes If-Modified-Since; If-Range mismatches
  fall back to full re-download rather than a possibly-stale 206.
- The media route serves without ETags (mutable user paths; only size is known), which is safe for
  the attachment path because inbound media IDs are UUID-based write-once files — a resumed
  Range: bytes=N- tail cannot belong to a different file.
- Interrupted downloads: `res` close -> handle closed; stream errors -> onReadError or destroy.
  No descriptor leak on any path.

## Item 4 — #158013 watch (read-only)
- Still open, head 7065ca24d8d9, updated 2026-09-25T08:10:23Z; 2 bot comments, 0 review comments.
- No human maintainer reply. No revision.
