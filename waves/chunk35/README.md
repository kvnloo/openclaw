# Chunk 35 — #158013 clawsweeper re-review + Santiago salvage case

## #158013 watch (read-only): new clawsweeper review landed

clawsweeper posted a second review on 2026-09-27 00:27 UTC (head 7065ca24d8d9,
same as before):

- **Current main now contains the DST grouping fix** via merged #158846
  ("refactor(ui): deslop pages third pass"). Our PR's production edit conflicts
  with the merged fix.
- **Distinct remaining value identified:** the Santiago skipped-midnight
  regression case is absent from main's real-timezone test (main covers
  America/Los_Angeles transitions + year rollover only).
- Suggested maintainer move: keep the merged calendar-date implementation as the
  single grouping owner and, if the PR continues, reduce it to a focused
  Santiago case in the existing real-timezone regression test. Also flags that
  real rendered-state proof (Workshop run, sanitized screenshots) is still
  outstanding — not operable from this lane.
- Verdict: needs proof; "do not merge until maintainers decide whether the
  risk is worth taking."

No revision posted to the upstream PR (fork-only standing order; the standing
queue required a human maintainer reply for revision, and this is a bot
review). No upstream writes.

## Salvage branch in this chunk: `muse/wave-c-santiago-salvage`

Fork-only, zero upstream writes. A drop-in regression test in upstream's
real-TZ test style (`proposal-records-santiago.test.ts`), exercising
America/Santiago 2026-09-06 — the date local midnight is skipped entirely
(00:00 -> 01:00). Meant to be copied into
`ui/src/pages/skill-workshop/` on upstream main (review-pinned
`b8e5c0e0eadf`); it imports `./proposal-records.ts` exactly like the existing
test.

Verification (local, real TZ, no repo clone):
- `new Date(2026, 8, 6, 0, 0)` under TZ=America/Santiago normalizes to
  01:00 (midnight genuinely skipped) — fixture is real.
- Merged upstream logic (calendar-date constructor subtraction) yields
  `["today", "yesterday", "earlier"]` — GREEN.
- `setDate(-1)`-from-day-start bug class (the exact class called out in the
  original PR body) yields `["today", "earlier", "earlier", ...]` — RED on
  base. The Santiago case discriminates this class; the LA cases do not.

AI-assisted (Muse, Meta's Muse Spark).
