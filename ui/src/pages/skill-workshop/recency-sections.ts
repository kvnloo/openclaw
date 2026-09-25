import type { SkillWorkshopProposal } from "../../lib/skill-workshop/index.ts";

// Rendered section labels for the Skill Workshop queue, in display order.
// Extracted from view.ts so the record -> section pipeline is unit-testable
// without pulling in the Lit view tree.
export const GROUP_LABEL: Record<SkillWorkshopProposal["recencyGroup"], string> = {
  today: "skillWorkshop.recency.today",
  yesterday: "skillWorkshop.recency.yesterday",
  earlier: "skillWorkshop.recency.earlier",
};

export function groupByRecency(
  proposals: SkillWorkshopProposal[],
): Array<{ label: string; items: SkillWorkshopProposal[] }> {
  const buckets = new Map<SkillWorkshopProposal["recencyGroup"], SkillWorkshopProposal[]>();
  for (const proposal of proposals) {
    const list = buckets.get(proposal.recencyGroup) ?? [];
    list.push(proposal);
    buckets.set(proposal.recencyGroup, list);
  }
  const order: Array<SkillWorkshopProposal["recencyGroup"]> = ["today", "yesterday", "earlier"];
  return order
    .filter((key) => buckets.has(key))
    .map((key) => ({ label: GROUP_LABEL[key], items: buckets.get(key) ?? [] }));
}
