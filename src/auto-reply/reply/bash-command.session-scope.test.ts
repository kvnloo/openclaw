// Tests that chat bash job tracking is scoped to the issuing session:
// one session's running job must not block, expose, or kill another session's job.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../../config/config.js";
import type { MsgContext } from "../templating.js";

const {
  cancelBackgroundExecSessionMock,
  createExecToolMock,
  getFinishedSessionMock,
  getSessionMock,
} = vi.hoisted(() => ({
  cancelBackgroundExecSessionMock: vi.fn(),
  createExecToolMock: vi.fn(),
  getSessionMock: vi.fn(),
  getFinishedSessionMock: vi.fn(),
}));

vi.mock("../../agents/bash-process-control.js", () => ({
  cancelBackgroundExecSession: cancelBackgroundExecSessionMock,
}));

vi.mock("../../agents/bash-process-registry.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../agents/bash-process-registry.js")>()),
  getSession: getSessionMock,
  getFinishedSession: getFinishedSessionMock,
}));

vi.mock("../../agents/bash-tools.js", () => ({
  createExecTool: createExecToolMock,
}));

const { handleBashChatCommand } = await import("./bash-command.js");

function buildParams(commandBody: string, sessionKey: string) {
  const cfg = { commands: { bash: true } } as OpenClawConfig;
  const ctx = {
    CommandBody: commandBody,
    commandText: commandBody,
    SessionKey: sessionKey,
  } as MsgContext;
  return {
    ctx,
    cfg,
    sessionKey,
    isGroup: false,
    elevated: { enabled: true, allowed: true, failures: [] },
  };
}

function backgroundExecResult(sessionId: string) {
  return {
    content: [],
    details: { status: "running", sessionId, startedAt: Date.now() },
  };
}

function buildRunningSession(id: string, sessionKey: string) {
  return {
    id,
    command: "sleep 300",
    scopeKey: "chat:bash",
    sessionKey,
    backgrounded: true,
    exited: false,
    startedAt: Date.now(),
    tail: "",
    aggregated: "",
  };
}

describe("handleBashChatCommand session scoping", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    getFinishedSessionMock.mockReset();
    cancelBackgroundExecSessionMock.mockReset();
    createExecToolMock.mockReset();
    getSessionMock.mockReturnValue(undefined);
    getFinishedSessionMock.mockReturnValue(undefined);
  });

  it("lets a second session start its own job while the first session's job runs", async () => {
    const sessionA = "agent:main:slack:direct:U111";
    const sessionB = "agent:main:slack:direct:U222";
    const runningA = buildRunningSession("bash-a-1", sessionA);
    getSessionMock.mockImplementation((id: string) => (id === "bash-a-1" ? runningA : undefined));
    createExecToolMock.mockImplementation(() => ({
      execute: vi.fn(async () => backgroundExecResult("bash-a-1")),
    }));

    const startA = await handleBashChatCommand(buildParams("!sleep 300", sessionA));
    expect(startA.text).toContain("bash started");

    createExecToolMock.mockImplementation(() => ({
      execute: vi.fn(async () => backgroundExecResult("bash-b-1")),
    }));
    const startB = await handleBashChatCommand(buildParams("!echo hi", sessionB));
    expect(startB.text).toContain("bash started");
    expect(startB.text).not.toContain("already running");
  });

  it("does not let a bare !stop in one session kill another session's job", async () => {
    const sessionA = "agent:main:slack:direct:U333";
    const sessionB = "agent:main:slack:direct:U444";
    const runningA = buildRunningSession("bash-a-2", sessionA);
    getSessionMock.mockImplementation((id: string) => (id === "bash-a-2" ? runningA : undefined));
    createExecToolMock.mockReturnValue({
      execute: vi.fn(async () => backgroundExecResult("bash-a-2")),
    });

    const startA = await handleBashChatCommand(buildParams("!sleep 300", sessionA));
    expect(startA.text).toContain("bash started");

    const stopB = await handleBashChatCommand(buildParams("!stop", sessionB));
    expect(stopB.text).toContain("No active bash job");
    expect(cancelBackgroundExecSessionMock).not.toHaveBeenCalled();
  });

  it("does not expose another session's job through an explicit session id", async () => {
    const sessionA = "agent:main:slack:direct:U555";
    const sessionB = "agent:main:slack:direct:U666";
    const runningA = buildRunningSession("bash-a-3", sessionA);
    getSessionMock.mockImplementation((id: string) => (id === "bash-a-3" ? runningA : undefined));

    const pollB = await handleBashChatCommand(buildParams("!poll bash-a-3", sessionB));
    expect(pollB.text).toContain("No bash session found");
  });
});
