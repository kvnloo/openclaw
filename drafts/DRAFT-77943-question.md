# DRAFT — design question comment for openclaw/openclaw#77943 (HELD — do not post)

*Drift-diff checked against current main 2026-09-25 ~16:45 CDT.*

> **User-facing problem:** every JSON consumer of the CLI — desktop
> frontends, CI scripts, SDK wrappers — hand-rolls defensive shape coercion
> per subcommand. The RFC author (Crystal desktop, ~30 views) maintains ~12
> coercion blocks. Each new command-specific field added to any envelope
> silently widens the contract those consumers must duck-type.

## Drift-diff: RFC vs current main

The RFC (filed against `2026.4.20`) proposed standardizing `--json` list
output on a versioned envelope (`$schema`, `version`, `kind`, `count`,
`items`, `meta`) with a three-release migration path
(`--json-envelope=v1` opt-in → default flip → legacy removal), and offered
to draft the schema.

On current main the drift is **widening, not narrowing**:

- `openclaw agents list --json` → bare array
  (`src/commands/agents.commands.list.ts`: `writeRuntimeJson(runtime, summaries)`).
- `openclaw sessions --json` → object envelope that has *grown* since the
  RFC: `{path, stores?, allAgents?, count, totalCount, limitApplied,
  hasMore, activeMinutes, sessions: [...]}` (`src/commands/sessions.ts`).
  The RFC's table listed `{path, count, activeMinutes, sessions}` — five
  more fields have landed since.
- clawsweeper review 2026-09-05: "current main and v2026.9.1 explicitly
  retain command-specific success payloads. The requested standardization
  remains unimplemented, and no verified replacement owns it."

So main is accumulating per-command envelope fields while the RFC's
standardization question sits unanswered — every new field is a new
line in someone's coercion block.

## The design question

Is the per-command shape now the de facto contract — i.e., has the team
implicitly chosen **document-and-freeze** (each command's envelope is its
stable contract, consumers adapt per command)? If so, the RFC can close
with that as the recorded decision, and the useful follow-up is smaller:
document each list command's envelope in one place so consumers stop
reverse-engineering them.

Or is the versioned envelope still wanted? If yes, the RFC's migration
path needs an owner, and there's a narrower slice worth deciding first:
the author offered to draft the schema — would a schema-only PR (no
behavior change, new commands adopt it first) be a welcome first step,
or does the team want the full three-release migration committed before
any schema lands?

---
authored with AI assistance (Muse, Meta's Muse Spark) under the contributor's direction.
