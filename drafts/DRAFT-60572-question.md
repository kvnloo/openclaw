# DRAFT — design question comment for openclaw/openclaw#60572 (HELD — do not post)

*Re-verified against current main 2026-09-25 ~16:30 CDT: `src/plugins/slots.ts`
still defines exactly two mutually-exclusive slots (`memory`,
`contextEngine`); `resolveMemorySlotDecisionShared`
(`src/plugins/config-activation-shared.ts`) still disables non-owning
`kind: "memory"` plugins; zero implementation of the RFC's four sub-slots.
Thread unchanged since 2026-09-24 (7 comments, no maintainer response).*

> **User-facing problem:** any deployment that pairs a second memory backend
> (Mem0, Honcho) with `memory-core`'s dreaming or compaction loses one of the
> two. The workarounds in this thread — deleting `slots.memory` from config,
> sidecar processes, hijacking the `contextEngine` slot — are all production
> deployments telling us the single-owner memory slot is the constraint.

## Drift-diff: RFC vs current main (checked 2026-09-25)

The slot machinery on main is still exactly two mutually-exclusive slots.
`src/plugins/slots.ts` defines `memory` and `contextEngine` with single-owner
selection (`resolveSlotSelection`: unset → implicit default owner, never
"whichever plugin happens to be enabled"); `resolveMemorySlotDecisionShared`
(`src/plugins/config-activation-shared.ts`) disables any `kind: "memory"`
plugin that doesn't own the slot. The RFC's four sub-slots
(`memory.recall` / `memory.compaction` / `memory.capture` / `memory.userModel`
with per-agent scoping) have no implementation on main, and the previously
linked implementation PR is closed unmerged — consistent with the
clawsweeper review of 2026-09-21.

Two architectures are now on the table in this thread:

1. **The RFC's shape:** isolated storage engines per slot, each slot a
   plugin-owned backend.
2. **RemanenetSpy's alternative (2026-08-26):** one underlying event ledger
   with slots as *query-time typed predicate dimensions* (`MemorySlotRecord`
   with `slot: 'episodic' | 'procedural' | 'semantic'`, per-slot supersession
   and TTL policies) — avoiding cross-plugin serialization overhead and race
   conditions.

KinthAI's production report (2026-04-28) converged on a three-slot variant
(profile / episode / semantic) with the profile slot as source of truth;
ferhimedamine's (2026-06-17) on typed entries with per-type decay curves.
Everyone agrees on *typed memory*; nobody agrees on *where the types live*.

## The design question

Which invariant do you want the slot system to guarantee?

- **(a) Isolated storage engines:** each slot is a plugin-owned backend with
  its own persistence and lifecycle (the RFC's framing). More moving parts,
  but a slot can be swapped or scaled independently.
- **(b) Typed query dimensions over one ledger:** one store, slots as
  query-time predicates with per-slot retention policy. Simpler runtime, but
  the "slots" become a query concern, not a plugin-installation concern.

And a narrower product question underneath it: is the near-term decision
smaller than the full taxonomy? The concrete pain in this thread is
*feature* coexistence — `memory-core`'s dreaming alongside a foreign memory
backend — not the full four-slot split. Would `memory-core`'s dreaming (and
similar features) loading as contributions that don't require owning the
memory slot resolve the reported deployments, with the taxonomy deferred?

---
authored with AI assistance (Muse, Meta's Muse Spark) under the contributor's direction.
