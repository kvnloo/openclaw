// Covers modifying-hook event isolation: handler mutations must not leak into
// later handlers' events for hooks that share the dispatch event.

import { describe, expect, it, vi } from "vitest";
import { createHookRunnerWithRegistry } from "./hooks.test-fixtures.js";

const agentCtx = {
  sessionId: "test-session",
  channel: "webchat",
};

function mutatingDecliner() {
  return vi.fn().mockImplementation((event: Record<string, unknown>) => {
    event.injected = "mutated";
    return undefined;
  });
}

describe("modifying hook event isolation", () => {
  it("resolve_exec_env: a handler's event mutations do not reach the next handler", async () => {
    const observed: unknown[] = [];
    const observer = vi.fn().mockImplementation((event: unknown) => {
      observed.push(event);
      return { PLUGIN_A: "yes" };
    });
    const { runner } = createHookRunnerWithRegistry([
      { hookName: "resolve_exec_env", handler: mutatingDecliner(), pluginId: "plugin-a" },
      { hookName: "resolve_exec_env", handler: observer, pluginId: "plugin-b" },
    ]);

    const event = { toolName: "exec" as const, host: "gateway" as const };
    const result = await runner.runResolveExecEnv(event, agentCtx);

    expect(result).toEqual({ PLUGIN_A: "yes" });
    expect(observer).toHaveBeenCalledTimes(1);
    expect(observed).toHaveLength(1);
    expect(observed[0]).toEqual({ toolName: "exec", host: "gateway" });
    // The caller's event is isolated too.
    expect(event).toEqual({ toolName: "exec", host: "gateway" });
  });

  it("before_model_resolve: a handler's event mutations do not reach the next handler", async () => {
    const observed: unknown[] = [];
    const observer = vi.fn().mockImplementation((event: unknown) => {
      observed.push(event);
      return { modelOverride: "llama3.3:8b" };
    });
    const { runner } = createHookRunnerWithRegistry([
      { hookName: "before_model_resolve", handler: mutatingDecliner(), pluginId: "plugin-a" },
      { hookName: "before_model_resolve", handler: observer, pluginId: "plugin-b" },
    ]);

    const event = { prompt: "hello" };
    const result = await runner.runBeforeModelResolve(event, agentCtx);

    expect(result).toEqual({ modelOverride: "llama3.3:8b", providerOverride: undefined });
    expect(observer).toHaveBeenCalledTimes(1);
    expect(observed).toHaveLength(1);
    expect(observed[0]).toEqual({ prompt: "hello" });
    expect(event).toEqual({ prompt: "hello" });
  });

  it("message_sending: a handler's event mutations do not reach the next handler", async () => {
    const observed: unknown[] = [];
    const observer = vi.fn().mockImplementation((event: unknown) => {
      observed.push(event);
      return { content: "from-b" };
    });
    const { runner } = createHookRunnerWithRegistry([
      { hookName: "message_sending", handler: mutatingDecliner(), pluginId: "plugin-a" },
      { hookName: "message_sending", handler: observer, pluginId: "plugin-b" },
    ]);

    const event = { to: "user", content: "original" };
    const result = await runner.runMessageSending(event, agentCtx);

    expect(result?.content).toBe("from-b");
    expect(observer).toHaveBeenCalledTimes(1);
    expect(observed).toHaveLength(1);
    expect(observed[0]).toEqual({ to: "user", content: "original" });
    expect(event).toEqual({ to: "user", content: "original" });
  });
});
