# Wave C chunk 16 — pairing QR provisioning + suspend/thaw channel accounting

Fork-only audit (kvnloo/openclaw). No code changes; nothing touched upstream.

## Hunt 1 — pairing QR provisioning edges — NEGATIVE

Surfaces: `src/gateway/server-methods/device-pair-setup.ts`,
`src/pairing/setup-code.ts`, `src/infra/device-pairing-join-code.ts`,
`src/gateway/device-pairing-join-http.ts`,
`src/gateway/server/ws-connection/connect-pairing-approval-plan.ts`,
`src/cli/qr-cli.ts`, `src/infra/device-bootstrap.ts`.

Fences found:
- Join codes are random 128-bit shortcodes stored in shared SQLite, with
  future-expiry-only at register and payload round-trip validation.
- Redeem is an atomic single-use burn (delete-expired + select + delete in one
  write transaction), shortcode format-checked and trimmed, expiry enforced
  twice (DB purge and `decodePairingSetupCode` throwing on expired
  `expiresAtMs`).
- The `/j/<shortcode>` route is GET-only with no query string, shortcode
  format-checked, rate-limited (failures recorded per IP, reset on success),
  `Cache-Control: no-store`.
- `resolveDevicePairingJoinBaseUrl` refuses non-TLS/non-loopback URLs (throws;
  no plaintext LAN join URLs).
- Bootstrap tokens are TTL-bounded, bound to deviceId+publicKey, profile-scoped;
  the approval plan requires canonical client-id/platform agreement before any
  silent approval. The setup code carries only the bounded bootstrap
  credential — the response `auth` field is a label, never the raw gateway
  token/password. Access is downgraded on plaintext LAN; TLS fingerprints are
  pinned for direct wss.

Observations (not defects):
- `payload.urls` is never populated by any producer — decode-only legacy field
  — so the "first TLS candidate" loop always resolves to `payload.url`; the
  qr-cli "Fallback:" rendering path is dead in practice.
- Expired join-code rows linger in shared SQLite until the next register/redeem
  (no periodic prune); inert after expiry (bootstrap TTL + redeem expiry
  enforce it), but rows accumulate between registrations.

## Hunt 2 — gateway suspend/thaw channel accounting — NEGATIVE

Surfaces: `src/gateway/channel-thaw-restart.ts`,
`src/gateway/host-thaw-recovery.ts`, `src/gateway/server-maintenance.ts`,
`src/gateway/server-core-runtime.ts` (restartRunningChannels closure),
`src/gateway/server-methods/suspend.ts`.

Fences found:
- A new thaw merges old `pendingThawRestartTargets` with a fresh snapshot
  (dedupeByKey).
- A `shouldContinue` abort (suspension commit mid-run) rolls remaining+failed
  targets into the pending list — no target lost.
- Deferred retry re-fences every target (manually-stopped, isAccountListed,
  fresh snapshot) before stop/start.
- The admission commit blocks concurrent suspension during restarts; the
  invalidation callback aborts cleanly.
- Host-thaw-recovery single-flights via `activeRecovery`; a new freeze while a
  deferred retry is pending replaces the pending record but keeps the target
  list, merged on the next new-thaw.

Observation (not a defect):
- The "host thaw channel restart abandoned after 10 minutes" log line is
  misleading: `expireChannelRestart` only clears the tick-level pending record;
  the failed-target list (`pendingThawRestartTargets` in server-core-runtime)
  survives and merges into the next new-thaw's pendingTargets. Targets are
  deferred, not abandoned.

## Watch — #158013 (read-only)

Still open, head 7065ca24d8d9, updated 2026-09-25T08:10:23Z,
2 comments (both clawsweeper[bot]), 0 review comments. No human maintainer
reply. No revision.
