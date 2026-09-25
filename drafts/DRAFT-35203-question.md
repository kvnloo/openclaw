# [RFC follow-up] Multi-agent collaboration (#35203): which layer is in scope, and is Layer 1 by-product telemetry?

**Held draft — not posted.** Prepared 2026-09-25 for openclaw/openclaw#35203.
Target thread: https://github.com/openclaw/openclaw/issues/35203

---

The four-layer framing in this RFC is still the clearest map of the multi-agent scaling problem I've seen. Six months on, the thread has accumulated something the original proposal didn't have: shipped and production evidence. Re-reading the RFC against that evidence, three things have drifted, and they point at one scoping question.

## What's drifted since March

**1. The prior-art table is stale.** The RFC lists #27340 (Native Multi-Agent Session Sharing) as Open. It is now closed as stale (3 comments). The related-issue map the RFC asks readers to navigate by no longer describes the repo.

**2. The motivating number is overstated by the thread's own data.** The RFC claims multi-agent tasks consume "4-6× the tokens of single-agent execution (analyzed from `subagent-spawn.ts` and `buildSubagentSystemPrompt`)". The practitioner data posted in this thread (chunxiuxiamo, 2026-03-18, production multi-agent deployments) measures **2.9–3.2×** across research, code-review, and content-generation tasks. Still worth fixing, but the 4-6× figure makes the problem look ~2× worse than measured.

**3. The thread converged on by-product telemetry, not the RFC's P1.** The RFC's implementation plan starts with P1: an explicit `performance_records` table with auto-recording. But the shipped evidence in this thread goes the other way:
- mmartoccia (2026-04-12): Octo's `src/octo/head/elo.ts` generates Layer-1 capability data **as a by-product of running missions** — pairwise Elo updates parsed from verdict output, no profiling campaign, no new tables.
- kinthaiofficial (2026-04-26/28): a production 31-agent deployment runs on a per-agent ledger of `(task_type → success_rate, avg_tokens, avg_latency)` updated on each completed task, with the dispatcher reading it at delegation time.

Nobody in the thread built the explicit profiling primitive. Everybody who shipped something derived the data from runs that were already happening.

(I verified the RFC's infrastructure premises are intact on current main: `src/agents/subagents/spawn/subagent-spawn.ts`, `src/agents/subagents/announce/subagent-announce.ts`, and `extensions/memory-lancedb` are all present. The architecture the RFC describes is still the architecture.)

## The question

This issue carries `needs-product-decision` and `no-new-fix-pr`, so I'm asking, not proposing code:

**Is any of the four layers currently in scope? And if Layer 1 is, is the preferred path still P1's explicit `performance_records` table, or by-product telemetry emitted from existing delegation runs?**

The by-product path looks strictly smaller: no new storage primitive, no profiling campaign, and it matches what two independent production deployments actually built. If the answer is "by-product", the RFC's P1–P2 could be re-scoped to a telemetry-emission spec (what each spawn/completion run records, where the ledger lives, who reads it at dispatch) rather than new tables.

Secondary: should the RFC's motivation section be refreshed to the measured ~3× multiple and the prior-art table updated for #27340's closure?

---
*Posted on behalf of kvnloo. This draft was prepared with AI assistance (Muse, Meta's Muse Spark) under the contributor's direction.*
