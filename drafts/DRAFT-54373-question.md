# DRAFT — design question comment for openclaw/openclaw#54373 (HELD — do not post)

*Re-verified against current main 2026-09-25 ~16:30 CDT: zero hits for
`injected_at` anywhere on main (code search); `src/agents/bootstrap-cache.ts`
(95 lines), `src/sessions/input-provenance.ts` (250 lines),
`src/agents/memory-write-provenance.ts` (173 lines), and
`src/memory/memory-artifact-provenance.ts` (228 lines) all present.
Thread unchanged since 2026-09-23 (7 comments, no maintainer response).*

> **User-facing problem:** the agent reads injected context — bootstrap
> files, plugin prompt sections, memory results — but gets no signal about
> *how fresh* each segment is or *which* segments are volatile. It must
> trust every injected line equally, whether it's a stable identity file or
> a rapidly-changing status readout.

## Drift-diff: RFC vs current main (checked 2026-09-25)

The RFC's phased tag contract (`<!-- source / injected_at / volatile -->`
on injected segments) has **not** landed:

- **Phase 1 (inline tags):** absent. Zero hits for `injected_at` anywhere on
  main; PR #54830 is closed unmerged. (Side note: the
  `clawsweeper:linked-pr-open` label on this issue looks stale — the linked
  PR is closed, not open.)
- **Bootstrap refresh:** present. `src/agents/bootstrap-cache.ts` re-reads
  workspace bootstrap files per turn so long-lived sessions pick up edits
  (inode/mtime-guarded cache, 64-snapshot cap). Content staleness is
  *mechanically* eliminated for bootstrap files — but no freshness signal is
  attached to what gets injected.
- **Structured runtime provenance:** present, but it tags the wrong layer
  for this RFC. `src/sessions/input-provenance.ts` classifies message
  sources (`external_user` / `inter_session` / `internal_system`);
  `src/agents/memory-write-provenance.ts` and
  `src/memory/memory-artifact-provenance.ts` record write provenance. These
  answer "where did this message/write come from" — not "how fresh is this
  injected segment".
- **Phase 2 (freshness on `memory_search` / `memory_get` output):** absent.
  No `last_modified` surfacing exists in the memory tool output paths.

So the freshness *mechanism* exists (refresh on read) while the freshness
*signal to the agent* does not.

## The design question

With refresh-on-read eliminating stale bootstrap content, is the RFC's
general freshness contract subsumed — or is the inline signal still wanted
for a specific decision the agent makes? Two candidate minimal behaviors:

- **(a) Volatility classification on injected segments:** the agent doesn't
  need timestamps if it knows *which* segments are volatile vs stable — a
  much smaller contract than per-segment `injected_at`.
- **(b) `last_modified` on memory tool output only:** Phase 2's ask, scoped
  to `memory_search` / `memory_get` results where recency genuinely changes
  interpretation.

One open sub-question: bootstrap files refresh per turn, but do plugin
`registerMemoryPromptSection` sections and context-engine injections get the
same cadence? If any injected segment class is *not* refresh-covered, the
tag contract matters more there than for bootstrap.

If the answer is "refresh is enough", this RFC can close with the mechanism
as the resolution. If the signal is still wanted, which of (a)/(b) — or what
narrower slice — earns its place?

---
authored with AI assistance (Muse, Meta's Muse Spark) under the contributor's direction.
