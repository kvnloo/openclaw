# Wave C chunk 15 — media ticket replay edges + channel start/stop audit logging

Audit-only chunk. All findings verified against kvnloo/openclaw fork main `dfbf998e`.
No code changes; nothing touched upstream.

## 1. Assistant-media ticket replay edges — NEGATIVE

`src/gateway/control-ui.ts`: `handleControlUiAssistantMediaRequest`.

Tickets are HMAC-SHA256 bearer tokens (`v1.<payload>.<sig>`), minted by this
process only, with a process-local 32-byte secret (`randomBytes(32)` — a gateway
restart is a hard revocation of all outstanding tickets) and a 5-minute TTL
(`CONTROL_UI_ASSISTANT_MEDIA_TICKET_TTL_MS = 5 * 60 * 1000`).

Replay edges checked and closed:

- **Session binding**: ticket payload carries `session` (sessionKey/agentId/sessionId
  triple). Byte-serve requires `ticketCandidate?.source === source` after relative
  paths are resolved against the policy's `executionCwd`, then requires the full
  session triple to match the freshly resolved policy. A ticket minted for session
  A cannot be replayed into session B; a recreated session gets a new sessionId
  and fails closed.
- **Source binding**: absolute sources are checked at verify time; relative sources
  skip the early check but are enforced post-resolution (`ticket.source === source`).
  If `executionCwd` moved between meta and byte requests, `assertCurrentPolicy()`
  catches it (session triple + remote + executionCwd + workspaceOnly + localRoots
  all re-resolved and compared).
- **Authorization freshness**: `assertCurrentPolicy()` runs after every async
  preparation on the byte path; `hasCurrentClientAuthority()` is re-checked.
  Profile-based readers are re-resolved against the live profile (scope ceiling
  re-applied). Token-based readers (no profileId) keep mint-time scopes for the
  5-minute window — inherent to bearer tickets, bounded by the short TTL.
- **File replacement**: outside-roots allowances carry a `file` identity
  (realPath/dev/ino); `openAssistantMedia` re-stats the descriptor and fails
  closed on mismatch. Inside-roots files are mutable by design (the route already
  documents that size/mtime cannot prove unchanged bytes); availability is
  re-checked at serve time.
- **No chaining**: `?meta=1` requests always require interactive auth — tickets
  cannot mint new tickets.
- **Fail-closed fallback**: valid ticket → no auth needed; bad/expired ticket with
  `mediaTicket` present → 404 even when interactive auth succeeds.
- Signature comparison is constant-time (`safeEqualSecret`).

Verdict: no replay-after-revocation, cross-session replay, or stale-authorization
defect. Replay within TTL against the same session/source is the intended design.

## 2. Managed-outgoing image ticket replay — NEGATIVE

`src/gateway/managed-image-attachments.ts`: `create/verifyManagedOutgoingImageTicket`.

Same HMAC/TTL shape (5 min), bound to `sessionKey` + `attachmentId` + `variant:
"full"`. Serve path re-resolves the managed record on every request
(`readManagedImageRecord`, sessionKey match, transcript-message match, media kind
check) even when the ticket is valid — replay after attachment deletion or
transcript removal 404s. A "full"-variant ticket on the thumbnail route is
explicitly intentional (lower-fidelity representation of the same authorized
bytes; comment in code).

Verdict: no replay defect; the record re-resolution at serve time closes the
deletion/revocation edge.

## 3. Channel start/stop audit logging — OBSERVATION (coverage gap, design-level)

`channels.start` / `channels.stop` / `channels.logout` in
`src/gateway/server-methods/channels.ts` perform operator control-plane actions
(starting/stopping channel accounts changes which accounts send/receive
messages), but nothing in the start/stop path writes to the audit ledger.

The ledger (`src/audit/audit-event-types.ts`, wired in
`src/gateway/server-runtime-subscriptions.ts`) has exactly three record families:
agent runs, tool actions, and opt-in message lifecycle. Channel lifecycle has no
record family and no event subscription. `server-channels.ts` (1718 lines) has
zero audit/event calls; operational logging goes only to per-channel logs.

Whether this is a gap or intended scope is a maintainer decision: the audit
doctrine (`docs/gateway/audit.md`) explicitly bounds the ledger to run/tool/
message lineage ("what audit records do and do not prove"), and repo policy
requires approval for changes to collection/bounds/contracts. Recorded as an
observation; not touched.

## #158013 watch (read-only)

Still open, updated 2026-09-25T08:10:23Z, 2 comments (both clawsweeper[bot]), no
human maintainer reply. No revision.

## Standing state

- Drafts #131897 (v2) / #111354 held for Kevin's posting decision when fork-only lifts.
- Stand-downs: #71428 (security), #120244 (active contributor), #139151 (secops-gated).
- Next classes: channel start/stop audit coverage question is a design item for the
  maintainers; assistant-media and managed-outgoing ticket surfaces are exhausted
  (NEGATIVE). Untouched areas: pairing QR provisioning edges, gateway suspend/
  thaw channel accounting.
