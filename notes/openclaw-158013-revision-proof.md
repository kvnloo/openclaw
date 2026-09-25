# #158013 revision: real behavior proof (fork branch)

**Status:** revision prepared on fork branch `muse/wave-c2-158013-proof`, NOT posted upstream.
Upstream PR: https://github.com/openclaw/openclaw/pull/158013 (open, head 7065ca24d8d9).
Trigger: clawsweeper review 2026-09-25 08:08 UTC — patch quality 4/6, no actionable
findings; blocked on "real behavior proof" (status: needs proof). Ask: "No real
Workshop run shows a prior-day proposal under Yesterday across a DST boundary;
inspected, sanitized before/after screenshots are also required for this
rendered-state change."

## What the revision changes (fix itself untouched)

The DST fix in `proposal-records.ts` (local calendar-day keys + local-noon anchor)
is byte-identical to the upstream PR head. The revision only strengthens proof:

1. **Extracted `groupByRecency` + `GROUP_LABEL`** from `view.ts` into
   `ui/src/pages/skill-workshop/recency-sections.ts` (pure, no Lit imports).
   `view.ts` imports it; rendered output is unchanged.

2. **New `recency-sections.test.ts`** — integration proof through the exact
   pipeline the Workshop renders:
   gateway-shaped `SkillsProposalRecordResult` fixtures
   → real `proposalFromActionRecord()` (assigns `recencyGroup`)
   → real `groupByRecency()` (orders the Today/Yesterday/Earlier sections).
   Cases: NY spring-forward (23h day), NY fall-back (25h day), Santiago skipped
   midnight, input-order independence, month boundary.

## Evidence (run 2026-09-25, Node v24.20.0, repo vitest lane)

- New suite: **5/5 pass** with the fix.
- Red check vs the original fixed-24h subtraction: **3/5 fail** (both NY DST
  cases + order case) — the test catches the reported bug.
- Red check vs naive day-start `setDate(-1)`: **1/5 fails** (Santiago) — the
  test discriminates the noon-anchor refinement.
- Existing `proposal-records.test.ts`: **5/5 pass** (no regression).
- `oxfmt --check`: clean on all three touched files.
- Typecheck (`tsgo` ui lane): see LOG entry for result.

Two-file wall time for the skill-workshop suites: ~65s (vitest run 21:45 UTC).

## Honest gap (not closable from this sandbox)

clawsweeper also asks for "inspected, sanitized before/after screenshots" from a
real Control UI run. That requires a live Gateway + browser session, which this
environment cannot operate. The automated pipeline proof above is the strongest
evidence producible here; screenshots remain a maintainer-side step. This is
stated plainly so the review bot's screenshot checkbox is not claimed as done.

## Suggested next step (for whoever drives the upstream PR)

If the pipeline proof satisfies the "real behavior proof" bar, the upstream PR
needs only its body updated (proof section) to trigger clawsweeper re-review —
no code change required on the PR itself.
