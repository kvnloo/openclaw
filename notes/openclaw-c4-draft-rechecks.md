# Chunk 4 — duplicate re-check verdicts (2026-09-25)

## #131897 (plugin update availability)
- Full comment history (2 comments): durable clawsweeper review 2026-09-06 (keep-open; "availability views remain missing; author has advanced the proposal into an active draft RFC"); clawsweeper **lease-marker** 2026-09-22T12:59 (review-started tracking comment, lease expired, durable review never landed).
- v1 draft error found and corrected: v1 attributed "explicit refresh and a shared pin-aware availability result" to "ClawSweeper's 09-22 review." No such review exists. The 09-22 item is a worker-lease marker.
- Overlap found: the RFC's open Q1 already asks "resolve every list vs opt-in flag; default should be non-blocking and cached" — v1's refresh-ownership framing substantially overlapped it.
- Novel remainder: pin-state semantics in the shared availability result (JSON consumers distinguishing "available" from "available but pinned") + result-age exposure on read surfaces. v2 narrowed to this.
- Verdict: HELD. Not a duplicate of any thread question; corrected and narrowed.

## #111354 (declarative provider manifests)
- Full comment history (3 comments): durable clawsweeper review 2026-09-05 ("narrowed SDK direction decision"; cross-capability lifecycle replacement "remains a meaningful, unresolved API choice"); openclaw-barnacle stale-mark 2026-09-20; clawsweeper lease-marker 2026-09-22T04:03.
- The 09-05 bot review converges with the draft's reading (2) — the draft now cites it as convergent evidence rather than claiming fresh drift.
- No human has answered the two-readings question. Verdict: HELD, not a duplicate.
