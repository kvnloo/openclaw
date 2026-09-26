# Wave C chunk 13 — avatar/http surfaces, DM pairing UI freshness, webchat reconnect

Fork-only audit notes. All three defect classes NEGATIVE.

## Item 1 — channel-avatar/http surfaces: NEGATIVE

- `src/gateway/channel-avatar-http.ts`: per-session LRU-128 cache keyed by sessionKey; a changed avatar reference evicts the cached image (reference re-read from the session row on every request, mismatch = reload, superseded bytes dropped).
- Browser staleness is revision-busted by design: `channelAvatarUrl = ...?v=sha256(reference)` (`session-utils-row.ts`, `control-ui-resource-routes.ts` — "a replaced or restored backing image must change the URL or mounted rows stay stale forever").
- Auth: `authorizeControlUiSessionOwnerReadRequestOrReply` + `requestAuth.assertCurrent()` after every await (revoked mid-flight = rejected).
- `sendHttpImageResponse`: ETag over sha256 of validated bytes, If-None-Match → 304, `content-disposition: attachment`, CSP `default-src 'none' ... sandbox`, `cross-origin-resource-policy: same-origin`, `x-content-type-options: nosniff`, HEAD-safe.
- Bytes validated before caching: mime sniffed via file-type (not extension), allowlist of 7 types, SVG only when `isSelfContainedSvg` and ≤64KB, 512KB hard cap.
- Media resolution: containment-checked against `<mediaDir>/inbound` with realpath fallback, single path segment — no traversal; media-store paths never exposed to the client.
- Assistant avatar file cache (`assistant-avatar-cache.ts`): keyed on full file identity (ctime/dev/ino/mtime/size) so an atomic same-size replacement cannot leave stale bytes; opened fd closed on both hit and miss paths (read consumer always closes). No fd leak.

## Item 2 — control-ui DM pairing UI freshness: NEGATIVE

- 30s visible-only `PollController` refresh (connected + pairing access only) + refresh on gateway snapshot changes. Cross-operator decisions land within one poll; expiry handled server-side (TTL prune), approve of an expired request fail-closes server-side.
- `mutateChannelPairing` (ui/src/lib/channels/index.ts): single in-flight mutation (`pairingBusyRequestId`), epoch-captured `isCurrent()` after the await (stale results dropped), optimistic snapshot removal then authoritative reload `loadChannelPairing({duringMutation:true})`; failures surface `pairingError` without touching the snapshot.
- Approve prompt captures the request object at open; busy state disables both buttons; prompt cleared on auth change.

## Item 3 — webchat transport reconnect specifics: NEGATIVE

- Reconnect supervisor (`ui/src/api/gateway.ts`): backoff 800ms→15s (1.7x), tick-watch force-reconnects silent sockets, remote-advertised tick intervals clamped (min/max).
- `createGatewayConnectionLifecycle`: epoch bumped on every transition; stale async results cannot publish into a new connection.
- Chat pane reconnect (`chat-pane-context.ts`): logical reconnect (same client) triggers startup-style history refresh with `awaitHistory` — missed transcript events are caught up; secondary session hydration deferred until transcript commits.
- Queued sends: `markQueuedChatSendsWaitingForReconnect` → `waiting-reconnect`/`unconfirmed`; flush only after history + sessions refreshes both prove the session idle (`flushChatQueueAfterIdleSessionReconciliation`) — no duplicate send into a live run.
- Disconnect cleanup: avatar/metadata/suggestion caches invalidated, typing actors + discussions cleared, sharing cache dropped (no cross-account identity leak), `reconnectResumeSessionId` saved.
- Auth on reconnect: device-token retry budget, stored-token mismatch clears the stored token.

## #158013 watch

Still open, head unchanged, updated 2026-09-25T08:10:23Z, 2 clawsweeper[bot] comments, 0 review comments. No human maintainer reply → no revision.
