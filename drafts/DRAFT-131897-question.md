# Design question — #131897: plugin update availability surfaces

Target thread: openclaw/openclaw#131897 (RFC: Surface plugin update availability in `plugins list` / `update status` / Control UI)
Status: HELD — not posted. Post only after re-verifying the thread has no duplicate of this exact question.

## The user problem (why this matters)

A user running a pinned plugin keeps running stale routing or provider config until something visibly breaks — today nothing in-band tells them a newer version exists. The RFC's three surfaces (`plugins list`, `update status`, Control UI) are the right read paths.

## Verified against current main (2026-09-25)

- `src/cli/plugins-list-command.ts` + `plugins-list-format.ts`: no `Latest` column, no update hint — installed versions only. Gap confirmed.
- `src/cli/update-cli/status.ts`: rows are core-only (`Install`, `Channel`, `Git`, `Update`); the only plugin rows are deferred-migration records, not availability. Gap confirmed.
- `src/cli/plugins-update-selection.ts`: no availability cache, no pin-aware result object — resolution is computed on demand inside the update command path. There is no shared "availability result" the three surfaces could reuse today.

## The design question

ClawSweeper's 09-22 review asks whether the RFC should advance with "explicit refresh and a shared pin-aware availability result." The missing piece the RFC doesn't name: **who owns refresh?**

Options on the table:

1. **Pull-on-read:** `plugins list` resolves availability per call (fresh, but adds registry/ClawHub latency to a hot path; offline users get a failure mode to design).
2. **Cache-owned:** a shared availability store refreshed on an explicit cadence or on `plugins update --dry-run`; all three surfaces read it (fast, but "update available" can go stale — and a stale badge is worse than no badge for the OmniRoute-style cadence problem the RFC is solving).
3. **Hybrid:** read surfaces show the cached result with its age; refresh is explicit (`--refresh` or the update command).

And **pin semantics**: a pinned plugin (deliberately held at an older version) should not show "⬆ update available" as if something were wrong — the shared result needs to carry the pin state so `update status` JSON consumers can distinguish "available" from "available but pinned."

Question for the RFC author/maintainers: which refresh ownership model does the RFC intend, and does the shared availability result carry pin state? Settling this before the three surfaces get built avoids three inconsistent implementations.
