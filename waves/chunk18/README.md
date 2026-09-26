# Wave C chunk 18 — race/fan-out audit (fork-only research record)

Three defect-class hunts, all NEGATIVE. No code changes; nothing touched upstream.

## 1. Proposal apply/reject server-side CAS races — NEGATIVE

`skills.proposals.apply` runs under the commit lock (collection + target leases keyed
`agentId:hash(target skillFile)`). Under the lock it re-reads the proposal, gates on
`pending`, and CAS-checks the revision hash against the evaluation-captured hash — a revise
landing mid-evaluation fails closed. It also verifies content hash vs `draftHash`,
evaluation-id continuity, target-tree SHA256 continuity, and an apply-target-unchanged
assert before the final `commitPendingSkillProposalTransition({ expected: record })`,
which conflicts if the record moved.

`reject`/`quarantine` (markProposal) take the target lock — mutually excluding apply —
re-read, status-gate, and `assertExpectedRevisionHash` against the live record.

The pre-lock read is lock-key material only; every gate is re-checked inside the lock.

## 2. Chat-send admission epoch races under reconnect — NEGATIVE

- Same `idempotencyKey` retry/replay returns the cached dedupe receipt; never re-admits.
- The pending reservation records `ownerConnId`/`ownerDeviceId` with expiry and rejects
  revival of evicted work.
- `assertCurrent()`/`hasCurrentClientAuthority` epoch fence is captured from the
  device-revocation capture: tentative transport generations are fenced, and accepted work
  follows the source owner's committed revocations — a reconnected client supersedes the
  old connection's in-flight admission at the next await.
- The reference-counted session work-admission lease retains the fence for detached queued
  turns; queued turns record terminal state only when the source no longer owns it.
- `reconnectResumeRequested` sends are ineligible for restart-safe replay, and the `global`
  key resolves to the agent's main session before every store lookup — no parallel
  transcript on replay.

## 3. Channel message fan-out ordering — NEGATIVE

Every chat frame carries a per-runId monotonic `seq` assigned synchronously before
broadcast. Fan-out to delivery keys (`agent:<id>:<key>`, `<key>`) plus `nodeSendToSession`
is synchronous iteration, so arrival order == seq order per key. `dropIfSlow` applies
only to liveText deltas whose `replace: true` full-text semantics absorb a dropped delta;
terminal frames (final/aborted/error) are retained and never dropped for slow clients.

## Watch: #158013

Read-only check 2026-09-25: still open, updated 2026-09-25T08:10:23Z, 2 bot comments,
no human maintainer reply. No revision.

---
*Authored with AI assistance (Muse, Meta's Muse Spark) under the contributor's direction.*
*Fork-only research record; no upstream changes.*
