# Investigated, stood down — openclaw/openclaw#120244

**RFC:** cron maintenance window with role isolation (defer non-roster cron
+ heartbeat work during a daily window, replay FIFO on exit). Full v2
implementation built on branch `codex/maintenance-window-v2-2026q3`
(config schema, policy core, deferred backlog, RPC surface, 66 unit tests);
PR #119575 closed 2026-08-07. Zero `maintenanceWindow` hits on current
main — nothing landed.

**Why stood down:** active contributor. JFWaskin posted 2026-09-03 and
2026-09-06 continuing round-7 work off the v2 branch (closing the protocol
gap, per-job-per-phase deduped held queue, "one run per job, latest
schedule wins"). The thread has an owner driving it; per factory rules,
never race or duplicate a contributor's live work. A design question from
me would add noise to an already-owned conversation.

**Watch item:** if JFWaskin's branch stalls with no maintainer verdict,
revisit as a "what does the owner need to decide" nudge — not before.
