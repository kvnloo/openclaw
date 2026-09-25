# Design question — #111354: declarative provider manifests

Target thread: openclaw/openclaw#111354 (RFC: Declarative provider manifests instead of per-vendor lifecycle re-implementation)
Status: HELD — not posted. Post only after re-verifying the thread has no duplicate of this exact question.

## What changed since the RFC (drift)

The RFC's core premise — every vendor plugin re-implements the same lifecycle, with per-entry re-bundling of install/onboard/catalog machinery — has materially drifted. Verified against current main (2026-09-25):

- `src/plugin-sdk/provider-entry.ts` ships `defineSingleProviderPluginEntry(options)` — a manifest-style helper that derives the plugin entry (auth wiring, catalog registration, lifecycle) from declarative options.
- **35 bundled provider plugins** now build on it (`extensions/apple-fm`, `arcee`, `baseten`, `byteplus`, `cerebras`, …).
- `provider-catalog-live-runtime.ts` / `provider-catalog-shared.ts` ship the shared catalog machinery.

So the consolidation seam the RFC asked for exists and is adopted — at least for single-provider plugins. The 55-bundle duplication figure came from the 2026.6.11 bundle artifact, not current source.

## The design question

This matches ClawSweeper's 09-05 recommendation ("narrow to existing SDK helpers"), and the barnacle stale-mark (09-20) suggests the thread has lost momentum in its current broad form.

Two readings of the remaining gap:

1. **The helper is the answer, narrowed:** the RFC's universal `defineProvider` contract is superseded; the remaining work is migrating stragglers onto `defineSingleProviderPluginEntry` and documenting it as the canonical seam.
2. **The helper covers only single-provider plugins:** the cross-capability lifecycle (a vendor shipping inference + speech + TTS in one plugin) is still re-implemented per vendor — that is where a manifest contract would still add value.

Question for the RFC author/maintainers: which reading is right? If (2), the RFC's most useful next revision would re-scope from "universal declarative contract" to "multi-capability manifest support on the existing SDK helpers" — a concrete delta against shipped code instead of a from-scratch contract.

## Re-check verdict (2026-09-25, chunk 4)

Full comment history re-verified. The durable clawsweeper review (2026-09-05) already recommends a "narrowed SDK direction decision" and treats the cross-capability lifecycle replacement as "a meaningful, unresolved API choice" — convergent with this draft's reading (2). openclaw-barnacle stale-marked the thread 2026-09-20 (author possibly disengaged). No human has answered the two-readings question; the draft is not a duplicate, but it should be read as a forcing function on the RFC author/maintainers rather than fresh drift. Status remains HELD.
