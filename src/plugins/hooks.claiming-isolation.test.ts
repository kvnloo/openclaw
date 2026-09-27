// Covers claiming-hook event isolation: a declining handler's mutations must not
// leak into later handlers' events or the caller's event object.

import { describe, expect, it, vi } from "vitest";
import { createHookRunnerWithRegistry } from "./hooks.test-fixtures.js";

function createClaimEvent() {
  return {
    content: "original",
    channel: "guildchat",
    accountId: "default",
    conversationId: "channel:1",
    isGroup: true,
  };
}

const claimCtx = {
  channelId: "guildchat",
  accountId: "default",
  conversationId: "channel:1",
};

describe("claiming hook event isolation", () => {
  it("does not let a declining handler's event mutations reach the next handler", async () => {
    const observedBySecond: unknown[] = [];
    const decliner = vi.fn().mockImplementation((event: Record<string, unknown>) => {
      // Simulate a misbehaving/buggy plugin handler that mutates the event
      // it was given before declining.
      event.content = "mutated";
      event.injected = true;
      return { handled: false };
    });
    const observer = vi.fn().mockImplementation((event: unknown) => {
      observedBySecond.push(event);
      return { handled: true };
    });
    const { runner } = createHookRunnerWithRegistry([
      { hookName: "inbound_claim", handler: decliner, pluginId: "plugin-a" },
      { hookName: "inbound_claim", handler: observer, pluginId: "plugin-b" },
    ]);

    const result = await runner.runInboundClaim(createClaimEvent(), claimCtx);

    expect(result).toEqual({ handled: true });
    expect(decliner).toHaveBeenCalledTimes(1);
    expect(observer).toHaveBeenCalledTimes(1);
    expect(observedBySecond).toHaveLength(1);
    // The second handler must observe the original event, not the mutation.
    expect(observedBySecond[0]).toEqual(createClaimEvent());
  });

  it("does not mutate the caller's event object when a handler declines", async () => {
    const decliner = vi.fn().mockImplementation((event: Record<string, unknown>) => {
      event.content = "mutated";
      return { handled: false };
    });
    const { runner } = createHookRunnerWithRegistry([
      { hookName: "inbound_claim", handler: decliner, pluginId: "plugin-a" },
    ]);

    const event = createClaimEvent();
    const result = await runner.runInboundClaim(event, claimCtx);

    expect(result).toBeUndefined();
    expect(event).toEqual(createClaimEvent());
  });

  it("still short-circuits at the first handler that claims the event", async () => {
    const first = vi.fn().mockResolvedValue({ handled: true });
    const second = vi.fn().mockResolvedValue({ handled: true });
    const { runner } = createHookRunnerWithRegistry([
      { hookName: "inbound_claim", handler: first, pluginId: "plugin-a" },
      { hookName: "inbound_claim", handler: second, pluginId: "plugin-b" },
    ]);

    const result = await runner.runInboundClaim(createClaimEvent(), claimCtx);

    expect(result).toEqual({ handled: true });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });
});
