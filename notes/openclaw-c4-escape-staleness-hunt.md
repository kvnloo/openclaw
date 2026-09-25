# Chunk 4 — defect-class rotation hunt (2026-09-25)

## Hunt 1: proposal-render escaping — NEGATIVE (defended)

Checked all HTML construction paths in the Skill Workshop UI against current main:

1. **Proposal list rows** (`ui/src/pages/skill-workshop/proposal-list.ts`) — lit `html` template interpolation (`${proposal.name}`, `${proposal.oneLine}`, `${proposal.ageLabel}`); lit auto-escapes string values. Safe.
2. **Skill document preview** (`collection-view.ts` `renderSkillDocument`) — `unsafeHTML(toSanitizedMarkdownHtml(...))`. The sanitizer is real: `markdown.ts` `renderSanitizedMarkdown` runs `DOMPurify.sanitize` with configured options, and the call site comments "Skills and drafts are untrusted preview material" with `remoteImages: false`. Defended by design.
3. **Diff blocks** (`chat-diff-render.ts` → `chat-diff-highlight.runtime.ts`) — `highlightDiffLines` builds lit `html` templates (`html`<span class=${classes}>${text}</span>``) with escaped text; raw `line.text` interpolated into `html` templates is escaped by lit. Safe.
4. **File preview modal** (`ui/src/components/file-preview-modal.ts`) — same `toSanitizedMarkdownHtml` sanitizer. Safe.

Repo-wide `unsafeHTML` sweep: only the two sanitized-markdown sites plus a code-highlighting helper whose output is documented escaped. No raw attacker-controlled HTML injection surface found.

## Hunt 2: Control UI staleness (workshop collection) — NEGATIVE (defended)

- Mutation actions (`skills.proposals.apply` / `reject` in `proposal-actions.ts`) call `invalidateSkillWorkshopReads` (generation bump + `skillWorkshopLoaded=false`) then `refreshAfterMutation` forces a full `loadSkillWorkshopProposals` reload. Installed skills arrive in the **same** `skills.proposals.list` response and are reassigned atomically — no split-brain between proposals and collection.
- Generation guards (`readGeneration` / `isCurrentRead`) discard late results from prior agent/session contexts; selection-request fences stop background reloads from silencing in-flight clicks.
- Collection count label deliberately withholds the count (rather than showing stale rows as fresh) when a list read fails (`collectionCountLabel`).
- The broader Control UI freshness model (`ui/src/lib/sessions/event-refresh-coordinator.ts`, 5s event windows, generation receipts per ui/AGENTS.md) was not audited this chunk — noted for a future rotation.

Both hunts recorded honestly as negative results. No defects manufactured.
