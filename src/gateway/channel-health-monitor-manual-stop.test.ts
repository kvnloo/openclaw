/**
 * Regression: a health-monitor-initiated restart must not clear an operator's
 * manual-stop flag that lands inside the stop -> start window.
 *
 * server-channels clears manuallyStopped on every start unless the caller
 * passes { preserveManualStop: true } (a cleared flag restarts the account
 * with outcome "started" instead of "skipped"/"manual-stop"). Every sibling
 * restart path passes the flag (timed-out recovery continuation, supervisor
 * auto-restart, crash-loop recovery) -- the monitor's restart must too.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChannelId, ChannelAccountSnapshot } from "../channels/plugins/types.public.js";
import { startChannelHealthMonitor } from "./channel-health-monitor.js";
import type { ChannelRuntimeSnapshot } from "./server-channel-runtime.types.js";
import type { ChannelManager } from "./server-channels.js";

function snapshotWith(
  accounts: Record<string, Record<string, Partial<ChannelAccountSnapshot>>>,
): ChannelRuntimeSnapshot {
  const channels: ChannelRuntimeSnapshot["channels"] = {};
  const channelAccounts: ChannelRuntimeSnapshot["channelAccounts"] = {};
  for (const [channelId, accts] of Object.entries(accounts)) {
    const resolved: Record<string, ChannelAccountSnapshot> = {};
    for (const [accountId, partial] of Object.entries(accts)) {
      resolved[accountId] = { accountId, ...partial } as ChannelAccountSnapshot;
    }
    channelAccounts[channelId as ChannelId] = resolved;
    const firstId = Object.keys(accts)[0];
    if (firstId) {
      channels[channelId as ChannelId] = resolved[firstId];
    }
  }
  return { channels, channelAccounts };
}

function createMockChannelManager(overrides?: Partial<ChannelManager>): ChannelManager {
  return {
    getRuntimeSnapshot: vi.fn(() => ({ channels: {}, channelAccounts: {} })),
    getAutostartSuppression: vi.fn(() => null),
    isAmbientAutostartSuppressed: vi.fn(() => false),
    isHealthMonitorEnabled: vi.fn(() => true),
    isAccountListed: vi.fn(() => true),
    isManuallyStopped: vi.fn(() => false),
    isAutoRestartScheduled: vi.fn(() => false),
    resetRestartAttempts: vi.fn(),
    startChannel: vi.fn(async () => new Map()),
    stopChannel: vi.fn(async () => {}),
    ...overrides,
  } as unknown as ChannelManager;
}

/** A running account with a stale socket: the monitor must restart it. */
function staleSocketAccount(): Partial<ChannelAccountSnapshot> {
  const now = Date.now();
  return {
    running: true,
    connected: true,
    enabled: true,
    configured: true,
    lastStartAt: now - 3_600_000,
    lastTransportActivityAt: now - 3_000_000,
  };
}

describe("channel-health-monitor manual-stop preservation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("passes preserveManualStop: true on monitor-initiated restarts", async () => {
    const manager = createMockChannelManager({
      getRuntimeSnapshot: vi.fn(() =>
        snapshotWith({ discord: { default: staleSocketAccount() } }),
      ),
    });
    const monitor = startChannelHealthMonitor({
      channelManager: manager,
      checkIntervalMs: 5_000,
      timing: { monitorStartupGraceMs: 0, staleEventThresholdMs: 60_000 },
    });

    await vi.advanceTimersByTimeAsync(1);

    expect(manager.stopChannel).toHaveBeenCalledWith("discord", "default", { manual: false });
    expect(manager.startChannel).toHaveBeenCalledTimes(1);
    expect(manager.startChannel).toHaveBeenCalledWith("discord", "default", {
      preserveManualStop: true,
    });
    monitor.stop();
  });
});
