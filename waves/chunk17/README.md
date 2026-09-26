# Wave C chunk 17 — pairing ingress, scope-upgrade replay, workshop epoch fences

Audit-only chunk. No code changes. All findings NEGATIVE (defended by design).

## 1. Device-pairing HTTP ingress auth edges — NEGATIVE

Surfaces: `src/gateway/server-http.ts` (`/j` route), `device-pairing-join-http.ts`,
`auth-rate-limit.ts`, `rate-limit-attempt-serialization.ts`, `pairing/join-code.ts`.

- The `/j` join route is intentionally public: the 132-bit shortcode (22-char
  base64url, strict regex) IS the credential. Redeem is an atomic single-use burn.
- All failure modes (bad format, wrong method, query present, unknown/expired/
  consumed code) collapse to an identical `404 {error:"not_found"}` — no
  enumeration oracle.
- Rate limiting is per `(scope, IP)` with scope-isolated buckets, serialized per
  `(scope, IP)` via `KeyedAsyncQueue` so concurrent failures count correctly.
  The shared `joinRateLimiter` instance is safe because buckets are scope-keyed.
- IP attribution is config-gated (`trustedProxies`/`allowRealIpFallback`);
  unattributable-proxy requests are rejected before any route stage runs.
- Brute-forcing 132 bits under per-IP lockout is infeasible.
  `Cache-Control: no-store` on the join response.

## 2. Gateway scope-upgrade replays — NEGATIVE

Surfaces: `src/gateway/device-scope-upgrade.ts` (`ScopeUpgradeCoordinator`),
`server-methods/device-scope-upgrade.ts`, `server-methods/devices.ts`.

- Request IDs are server-generated. `device.scopes.requestUpgrade` requires a
  paired device with matching publicKey, normalizes scopes, rejects unknown
  scopes, caps at the operator role policy, and requires requestedScopes to be a
  superset of current connection scopes (monotonic).
- `register()` captures `initialToken`/`initialApprovedAtMs` from the current
  paired record — replaying an old requestId after approval fails closed
  (approved evidence requires a token change or an approvedAtMs change).
- `wait()` gates on `sameOwner(deviceId+publicKey)`. The durable check requires:
  no pending pairing, matching publicKey, non-revoked token, scopes ⊆ token
  scopes. `waitUpgrade` re-checks the role-policy ceiling before releasing the
  token ("approval may outlive a role change").
- `notify()` has no owner check but is only a hint — the durable store is
  authoritative, so a forged notify grants nothing; notify call sites are
  operator-authenticated approval/rejection paths.
- Race noted (not a defect): approval completing between the initial
  `getPairedDevice` and `register` reports "rejected" to the waiter —
  ultra-rare, fail-closed.

## 3. Session-snapshot epoch fences in the skill-workshop lane — NEGATIVE

Surfaces: `ui/src/pages/skill-workshop/revision-admission.ts`,
`revision-session.ts`; `src/gateway/server-methods/skills.ts`
(`skills.proposals.requestRevision`); `chat-send-handler.ts`;
`attempt-tool-prepare.ts`.

- Client `isCurrent()` captures `(client, hello)` and is re-checked after every
  await (connection-epoch fence).
- `expectedRevisionHash` is inspected from the live proposal and enforced as a
  server-side CAS (`assertExpectedRevisionHash`; `revision-changed` surfaces
  cleanly). Server re-verifies: proposal exists, status pending, hash matches.
- The revision constraint (`SkillWorkshopProposalRevisionConstraint`) is
  forwarded through chat dispatch into tool preparation
  (`skillWorkshop.proposalRevision`) — a proposal change in the ACK→dispatch
  window is fenced at tool-invocation time.
- Session target resolution uses the cached managed session list with an
  `isUsableRevisionSession` gate (`!archived && !hasActiveRun`); residual row
  staleness is absorbed by `queueMode: "followup"`, and `chat.send` admission
  is authoritative for session validity. Created keys are normalized against
  the hello epoch (`resolveSessionKey`).

## 4. #158013 watch (read-only)

Still open, head `7065ca24d8d9`, updated 2026-09-25T08:10:23Z. 2 comments
(both clawsweeper[bot]), 0 review comments. No human maintainer reply —
no revision.

---

*Authored with AI assistance (Muse, Meta's Muse Spark) under the contributor's direction.*
