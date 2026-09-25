import type { SkillsProposalRecordResult } from "@openclaw/gateway-protocol";
// Behavior proof for the Skill Workshop DST recency fix (#157925 / #158013).
//
// proposal-records.test.ts proves recencyGroup() labels a single timestamp
// correctly. This suite proves the full pipeline the Workshop actually renders:
// gateway-shaped records -> proposalFromActionRecord() (the real record
// builder) -> groupByRecency() (the real section bucketing view.ts uses to
// order the Today / Yesterday / Earlier sections). Across DST boundaries, a
// prior-day proposal must land in the Yesterday section, rendered between
// Today and Earlier.
//
// The host timezone is simulated with a Date shim driven by
// Intl.DateTimeFormat, because worker-thread runners ignore process.env.TZ.
import { afterEach, describe, expect, it, vi } from "vitest";
import { proposalFromActionRecord } from "./proposal-records.ts";
import { GROUP_LABEL, groupByRecency } from "./recency-sections.ts";

type WallClock = [
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
];

// Captured before installZonedDate replaces the global; FakeDate has no UTC.
const RealDate = Date;

function zonedParts(ms: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  }).formatToParts(ms);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return {
    y: get("year"),
    mo: get("month"),
    d: get("day"),
    h: get("hour"),
    mi: get("minute"),
    s: get("second"),
  };
}

// Inverts zonedParts by fixed-point iteration; converges for the anchored
// (noon) wall clocks used here, which are never skipped or ambiguous hours.
function zonedWallClockToMs([y, mo, d, h, mi, s]: WallClock, timeZone: string): number {
  let guess = RealDate.UTC(y, mo - 1, d, h, mi, s);
  for (let i = 0; i < 4; i++) {
    const p = zonedParts(guess, timeZone);
    const diff =
      RealDate.UTC(y, mo - 1, d, h, mi, s) - RealDate.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
    if (diff === 0) {
      return guess;
    }
    guess += diff;
  }
  return guess;
}

// Minimal Date surface used by the record -> section pipeline, with local
// calendar reads routed through the simulated zone instead of the host
// timezone. Date.parse is delegated to the real Date: ISO strings parse as
// UTC per spec, independent of the host zone.
function installZonedDate(timeZone: string, nowMs: number) {
  class FakeDate {
    #ms: number;

    constructor(...args: number[]) {
      if (args.length === 0) {
        this.#ms = nowMs;
      } else if (args.length === 1) {
        this.#ms = args[0];
      } else {
        const [y, mo, d = 1, h = 0, mi = 0, s = 0] = args;
        this.#ms = zonedWallClockToMs([y, mo + 1, d, h, mi, s], timeZone);
      }
    }

    getFullYear(): number {
      return zonedParts(this.#ms, timeZone).y;
    }

    getMonth(): number {
      return zonedParts(this.#ms, timeZone).mo - 1;
    }

    getDate(): number {
      return zonedParts(this.#ms, timeZone).d;
    }

    getTime(): number {
      return this.#ms;
    }

    setDate(d: number): number {
      const p = zonedParts(this.#ms, timeZone);
      this.#ms = zonedWallClockToMs([p.y, p.mo, d, p.h, p.mi, p.s], timeZone);
      return this.#ms;
    }

    static now(): number {
      return nowMs;
    }

    static parse(value: string): number {
      return RealDate.parse(value);
    }
  }
  vi.stubGlobal("Date", FakeDate);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function actionRecord(id: string, at: WallClock, timeZone: string): SkillsProposalRecordResult {
  const iso = new RealDate(zonedWallClockToMs(at, timeZone)).toISOString();
  return {
    schema: "openclaw.skill-workshop.proposal.v1",
    id,
    kind: "create",
    status: "pending",
    title: `Proposal ${id}`,
    description: `Description for ${id}`,
    createdAt: iso,
    updatedAt: iso,
    createdBy: "skill-workshop",
    proposedVersion: "v1",
    draftFile: "PROPOSAL.md",
    draftHash: "abc123",
    target: {
      skillName: `Skill ${id}`,
      skillKey: `skill-${id}`,
      skillDir: `skills/skill-${id}`,
      skillFile: "SKILL.md",
    },
    scan: { state: "clean", scannedAt: iso, critical: 0, warn: 0, info: 0, findings: [] },
  } as SkillsProposalRecordResult;
}

const DST_CASES: Array<{
  timeZone: string;
  now: WallClock;
  previousDay: WallClock;
  earlier: WallClock;
}> = [
  // 23-hour day: US spring forward.
  {
    timeZone: "America/New_York",
    now: [2026, 3, 9, 12, 0, 0],
    previousDay: [2026, 3, 8, 12, 0, 0],
    earlier: [2026, 3, 6, 12, 0, 0],
  },
  // 25-hour day: US fall back.
  {
    timeZone: "America/New_York",
    now: [2026, 11, 2, 12, 0, 0],
    previousDay: [2026, 11, 1, 12, 0, 0],
    earlier: [2026, 10, 30, 12, 0, 0],
  },
  // Local midnight is skipped entirely on this date.
  {
    timeZone: "America/Santiago",
    now: [2026, 9, 6, 12, 0, 0],
    previousDay: [2026, 9, 5, 12, 0, 0],
    earlier: [2026, 9, 3, 12, 0, 0],
  },
];

describe("record -> section pipeline", () => {
  it.each(DST_CASES)(
    "renders the prior-day proposal under Yesterday across a DST boundary ($timeZone)",
    ({ timeZone, now, previousDay, earlier }) => {
      const nowMs = zonedWallClockToMs(now, timeZone);
      installZonedDate(timeZone, nowMs);
      const proposals = [
        proposalFromActionRecord(actionRecord("today-prop", now, timeZone), undefined),
        proposalFromActionRecord(actionRecord("yesterday-prop", previousDay, timeZone), undefined),
        proposalFromActionRecord(actionRecord("earlier-prop", earlier, timeZone), undefined),
      ];
      const sections = groupByRecency(proposals);
      expect(sections.map((section) => section.label)).toEqual([
        GROUP_LABEL.today,
        GROUP_LABEL.yesterday,
        GROUP_LABEL.earlier,
      ]);
      expect(sections[1]?.items.map((item) => item.key)).toEqual(["yesterday-prop"]);
    },
  );

  it("orders sections Today -> Yesterday -> Earlier regardless of input order", () => {
    const timeZone = "America/New_York";
    const now: WallClock = [2026, 3, 9, 12, 0, 0];
    installZonedDate(timeZone, zonedWallClockToMs(now, timeZone));
    // Deliberately shuffled: earlier first, today last.
    const proposals = [
      proposalFromActionRecord(actionRecord("e", [2026, 3, 6, 12, 0, 0], timeZone), undefined),
      proposalFromActionRecord(actionRecord("y", [2026, 3, 8, 12, 0, 0], timeZone), undefined),
      proposalFromActionRecord(actionRecord("t", now, timeZone), undefined),
    ];
    const sections = groupByRecency(proposals);
    expect(sections.map((section) => section.label)).toEqual([
      GROUP_LABEL.today,
      GROUP_LABEL.yesterday,
      GROUP_LABEL.earlier,
    ]);
    expect(sections[0]?.items.map((item) => item.key)).toEqual(["t"]);
  });

  it("groups the previous day as yesterday across a month boundary", () => {
    const timeZone = "America/New_York";
    installZonedDate(timeZone, zonedWallClockToMs([2026, 4, 1, 12, 0, 0], timeZone));
    const proposals = [
      proposalFromActionRecord(actionRecord("mar31", [2026, 3, 31, 12, 0, 0], timeZone), undefined),
    ];
    const sections = groupByRecency(proposals);
    expect(sections.map((section) => section.label)).toEqual([GROUP_LABEL.yesterday]);
    expect(sections[0]?.items.map((item) => item.key)).toEqual(["mar31"]);
  });
});
