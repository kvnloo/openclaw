// board.data.read delegates to gateway handlers with the operator's invocation.
// The ticket binds the widget to exactly one session: session-targeting params
// must be pinned to the ticket session so a widget cannot pivot the read.

import { describe, expect, it, vi } from "vitest";
import type { BoardSessionTarget } from "../boards/board-store.js";
import { readBoardDataBinding, type BoardCapabilityAuthority } from "./board-host-tools.js";

const cronList = vi.hoisted(() =>
  vi.fn(async ({ respond }: any) => respond(true, { jobs: [] }, undefined)),
);
const sessionsList = vi.hoisted(() =>
  vi.fn(async ({ respond }: any) => respond(true, { sessions: [] }, undefined)),
);
const usageCost = vi.hoisted(() => vi.fn(async ({ respond }: any) => respond(true, {}, undefined)));
const health = vi.hoisted(() =>
  vi.fn(async ({ respond }: any) => respond(true, { ok: true }, undefined)),
);

vi.mock("./server-methods/cron.js", () => ({
  cronHandlers: { "cron.list": cronList, "cron.status": vi.fn() },
}));
vi.mock("./server-methods/sessions-read.js", () => ({
  sessionReadHandlers: { "sessions.list": sessionsList },
}));
vi.mock("./server-methods/usage.js", () => ({
  usageHandlers: { "usage.status": vi.fn(), "usage.cost": usageCost },
}));
vi.mock("./server-methods/agents.js", () => ({
  agentsHandlers: { "agents.list": vi.fn() },
}));
vi.mock("./server-methods/health.js", () => ({
  healthHandlers: { health },
}));

const TICKET_SESSION: Required<BoardSessionTarget> = {
  sessionKey: "agent:main:session-a",
  agentId: "main",
};

function testAuthority(): BoardCapabilityAuthority {
  return {
    assertActive: () => {},
    boardSession: TICKET_SESSION,
    useCurrent: async <T>(start: () => T): Promise<Awaited<T>> => await start(),
    ticketAuthority: {} as never,
  };
}

function testInvocation() {
  return { req: {}, context: {}, params: {} } as never;
}

describe("board data binding session scoping", () => {
  it("pins cron.list sessionKey to the ticket session, ignoring widget params", async () => {
    const publish = vi.fn();
    await readBoardDataBinding(
      "cron.list",
      { sessionKey: "agent:main:session-b", limit: 10 },
      testInvocation(),
      testAuthority(),
      publish,
    );
    expect(cronList).toHaveBeenCalledTimes(1);
    const invocation = cronList.mock.calls[0]![0];
    expect(invocation.params.sessionKey).toBe("agent:main:session-a");
    // Non-session params still pass through.
    expect(invocation.params.limit).toBe(10);
    expect(invocation.req.params.sessionKey).toBe("agent:main:session-a");
  });

  it("pins cron.list sessionKey to the ticket session when the widget passes none", async () => {
    const publish = vi.fn();
    await readBoardDataBinding("cron.list", {}, testInvocation(), testAuthority(), publish);
    const invocation = cronList.mock.calls[0]![0];
    expect(invocation.params.sessionKey).toBe("agent:main:session-a");
  });

  it("fences sessions.list to the ticket agent", async () => {
    const publish = vi.fn();
    await readBoardDataBinding(
      "sessions.list",
      { agentId: "other-agent" },
      testInvocation(),
      testAuthority(),
      publish,
    );
    const invocation = sessionsList.mock.calls[0]![0];
    expect(invocation.params.agentId).toBe("main");
  });

  it("fences usage.cost to the ticket agent and drops gateway-wide scope", async () => {
    const publish = vi.fn();
    await readBoardDataBinding(
      "usage.cost",
      { agentScope: "all" },
      testInvocation(),
      testAuthority(),
      publish,
    );
    const invocation = usageCost.mock.calls[0]![0];
    expect(invocation.params.agentId).toBe("main");
    expect(invocation.params.agentScope).not.toBe("all");
  });

  it("leaves bindings without session targeting untouched", async () => {
    const publish = vi.fn();
    await readBoardDataBinding(
      "health",
      { verbose: true },
      testInvocation(),
      testAuthority(),
      publish,
    );
    const invocation = health.mock.calls[0]![0];
    expect(invocation.params).toEqual({ verbose: true });
  });
});
