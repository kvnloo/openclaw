# [RFC 0024] One-contract target vs main's separate systems — still the goal?

**Held draft — not posted.** Prepared 2026-09-25 for openclaw/openclaw#113105.
Target thread: https://github.com/openclaw/openclaw/issues/113105
(RFC: openclaw/rfcs#42, accepted and merged as openclaw/rfcs@faf2a3a)

---

RFC 0024 has product-direction approval and a precise contract: one `LocalizationContext`, locale-invariant machine semantics, owner-local catalogs, and a `localization/surfaces.json` registry tracking 15 required surfaces × 21 translation targets. Re-reading that contract against current main, the gap hasn't narrowed in two months, and I want to check whether the target moved.

## What's drifted

**1. The registry doesn't exist.** Code search on current main for `localization/surfaces.json`: zero hits. The single artifact the rollout plan uses to count completion (315/315 cells) has no foothold in the repo.

**2. Main ships separate systems, not one contract.** The August review on this tracker found that "current main ships separate UI, wizard, and native localization systems rather than the requested shared contract and rollout governance." The RFC's core demand — adopt one localization contract while preserving surface ownership — is not what main does today.

**3. The foundation stack is stalled.** The progressive delivery stack this tracker defines (#111541 runtime foundation, #112784 catalog authoring/refresh exemplar, #112801 surface-disposition gate) is still entirely open and unmerged. The last maintainer note on this thread (2026-07-23) named the next gate as "land the refreshed foundation/PK0 dependency chain, then supervise the first credentialed main-only catalog refresh before starting PK1" — no visible movement on that gate since.

## The question

This tracker carries `maintainer` + `needs-product-decision`, so this is a direction question, not an implementation proposal (I'm deliberately not touching the stack PRs or re-reviewing them):

**Is the "one contract" target still current?**

- If yes: what is the present blocker on the PK0/foundation chain, and can this tracker name it? Two months of open-but-unmerged foundation PRs with no named blocker is the kind of stall that compounds — the longer the separate systems evolve independently, the more expensive the eventual contract migration gets.
- If the separate UI/wizard/native systems have become the accepted architecture: should the tracker's completion target (15 surfaces × 21 targets = 315 cells under one contract) be re-scoped to match reality, rather than measuring against a contract main doesn't implement?

Either answer is fine. What's expensive is the ambiguity: contributors can't tell whether to build toward the contract or toward the separate systems.

---
*Posted on behalf of kvnloo. This draft was prepared with AI assistance (Muse, Meta's Muse Spark) under the contributor's direction.*
