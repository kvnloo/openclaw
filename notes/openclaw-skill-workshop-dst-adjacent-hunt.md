# Skill Workshop adjacent date/grouping hunt (2026-09-25)

Follow-up to PR #158013 (DST recency fix, open upstream). Hunted the same
bug class — fixed 86.4M ms durations used for *calendar-day* decisions —
across the repo. Method: code search for `86400000` / `24 * 60 * 60 * 1000`
in `ui/src`, plus `startOfDay` / `setDate` in `src/`.

## Findings

1. **`ui/src/pages/usage/heatmap.ts`** — `DAY_MS` used for day stepping,
   but dates are interpreted at **UTC noon** (`dateToUtcNoon`) and all math
   is UTC (`utcNoonToDate`, `timeZone: "UTC"`). UTC has no DST → exact.
   Clean (the codebase already knows the pattern; comment says "so day
   math never crosses DST edges").
2. **`ui/src/pages/chat/components/chat-message-timestamp.ts`** —
   `7 * 24 * 60 * 60 * 1000` is a max-age TTL (elapsed time, not calendar
   days); day rendering via `Intl.DateTimeFormat`. Clean.
3. **`ui/src/lib/sessions/session-roster-cache.ts`** — `30 * 24 * 60 * 60
   * 1000` is a TTL. Clean.
4. **`src/infra/session-cost-usage-cache-runtime.ts`** — `setDate(getDate()
   - 29)` for a rolling 30-day window start. `setDate` calendar subtraction
   is DST-safe (same wall-clock time, handles month rollover). Clean.
5. **`resolveUsageCostWorkerDayBucket`**
   (`src/infra/session-cost-usage-worker-runtime.ts`) — day bucketing via
   `{ mode: "time-zone", timeZone }`, timezone-aware. Clean.

## Negative result, kept

No adjacent instance of the bug class found. The noon-anchoring pattern
from #158013 remains the right approach, but there is nothing else to
apply it to in the current tree. Not forcing a fix where none exists.
