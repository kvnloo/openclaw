# #156341 drift check — NO DRIFT (2026-09-25)

Claim checked: "current main lacks task-scoped Decision selection" (RFC premise).

Verified on current main:
- `src/decisions/runtime.ts:71` — selection goes through `resolveDecisionModelSetting(config, options.agentId)`.
- `src/agents/decision-model-setting.ts` — resolves from `resolveAgentConfig(config, agentId)?.decisionModel ?? config.agents?.defaults?.decisionModel`. Agent-scoped or agent-defaults only. No task-level key anywhere in the resolution chain.

Premise holds. No drift to report.

Thread state: three same-author implementation slices open (#156407, #156484, #156656); umbrella #155131 open; ClawSweeper bot 09-23 already recommended approving the bounded selection contract with explicit disablement precedence. The open decision is the maintainer's, and the bot already surfaced it — no manufactured question from this lane.
