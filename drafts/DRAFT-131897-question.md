# Design question — #131897: plugin update availability surfaces (v2, re-checked 2026-09-25)

Target thread: openclaw/openclaw#131897 (RFC: Surface plugin update availability in `plugins list` / `update status` / Control UI)
Status: HELD — not posted. Correction to v1: v1 cited "ClawSweeper's 09-22 review" as the source of the "explicit refresh + shared pin-aware availability result" framing. That review does not exist — the 2026-09-22 activity on the thread is a clawsweeper lease-marker, not a durable review. The durable review is 2026-09-06 ("availability views remain missing; author has advanced the proposal into an active draft RFC"). Attribution corrected below.

## The user problem (why this matters)

A user running a pinned plugin keeps running stale routing or provider config until something visibly breaks — today nothing in-band tells them a newer version exists. The RFC's three surfaces (`plugins list`, `update status`, Control UI) are the right read paths.

## Verified against current main (2026-09-25)

- `src/cli/plugins-list-command.ts` + `plugins-list-format.ts`: no `Latest` column, no update hint — installed versions only. Gap confirmed.
- `src/cli/update-cli/status.ts`: rows are core-only (`Install`, `Channel`, `Git`, `Update`); the only plugin rows are deferred-migration records, not availability. Gap confirmed.
- `src/cli/plugins-update-selection.ts`: no availability cache, no pin-aware result object — resolution is computed on demand inside the update command path. There is no shared "availability result" the three surfaces could reuse today.

## What the RFC itself already asks (overlap, acknowledged)

The RFC's open question 1 already asks: should `Latest` resolve every plugin on every `list` (network cost) or be opt-in via `--verbose`/a flag, with a "non-blocking and cached" default? So the refresh-ownership framing in v1 overlapped the RFC's own Q1. This revision narrows to what's genuinely new.

## The design question (narrowed)

Whatever refresh ownership the RFC lands on, the three surfaces will consume one shared availability result. That result needs **pin semantics** — which the RFC never names:

- A pinned plugin (deliberately held at an older version) should not render "⬆ update available" as if something were wrong. The shared result must carry the pin state so `plugins list`, `update status`, and the Control UI distinguish "available" from "available but pinned" — and so `update status --json` consumers can gate automation on it.
- A stale cache is the worse failure mode here: a "no update" badge backed by a week-old check is actively misleading for the OmniRoute-style cadence problem the RFC exists to solve. If the RFC's default is "non-blocking and cached," the read surfaces should show the result's age (or a recheck affordance), not a bare badge.

Question for the RFC author/maintainers: does the shared availability result carry pin state, and do the read surfaces expose the result's age? Settling pin semantics in the result contract — before the three surfaces get built — avoids three inconsistent implementations of "available."
