// @vitest-environment node
import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";

// Skipped-midnight regression case for the Skill Workshop recency fix
// (openclaw/openclaw#157925, clawsweeper review on #158013, 2026-09-27).
//
// Current main groups by local calendar day and its real-timezone regression
// covers America/Los_Angeles DST transitions plus year rollover, but no zone
// that skips local midnight entirely. In America/Santiago, 2026-09-06 00:00
// never exists (clocks jump 00:00 -> 01:00), so `new Date(y, mo, d)` for that
// day normalizes to 01:00. The constructor-based calendar subtraction used on
// main stays exact because both sides of the comparison go through the same
// construction; a `setDate(-1)`-from-day-start variant misgroups the prior
// day as "earlier" here (verified locally). This case locks the behavior.
it("groups proposal dates by local calendar days when local midnight is skipped", () => {
  // V8 worker threads do not reliably observe TZ changes; one isolated process
  // exercises the skipped-midnight transition with real local dates.
  const output = execFileSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--input-type=module",
      "--eval",
      `
        import { proposalFromManifest } from ${JSON.stringify(new URL("./proposal-records.ts", import.meta.url).href)};
        // 2026-09-06: America/Santiago skips 00:00 (00:00 -> 01:00).
        const groups = [0, 1, 2].map((daysAgo) => {
          Date.now = () => new Date(2026, 8, 6, 12).getTime();
          const date = new Date(2026, 8, 6 - daysAgo, 12).toISOString();
          return proposalFromManifest({
            id: "skipped-midnight-proposal", kind: "create", status: "pending",
            title: "Skipped midnight proposal", description: "Synthetic skipped-midnight fixture",
            skillName: "skipped-midnight", skillKey: "skipped-midnight", createdAt: date, updatedAt: date,
          }).recencyGroup;
        });
        process.stdout.write(JSON.stringify(groups));
      `,
    ],
    {
      cwd: new URL("../../../../", import.meta.url),
      env: { ...process.env, TZ: "America/Santiago" },
      encoding: "utf8",
      timeout: 10_000,
    },
  );
  expect(JSON.parse(output)).toEqual(["today", "yesterday", "earlier"]);
});
