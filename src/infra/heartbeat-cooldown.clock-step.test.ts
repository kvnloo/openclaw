// Evidence for openclaw/openclaw#156693: the heartbeat flood guard must count
// in-window run starts regardless of buffer order after a backward
// wall-clock step.
//
// The buffer below is produced entirely through the registered heartbeat wake
// handler boundary (requestHeartbeatAndWait -> scheduler run ->
// recordRunBookkeeping), using manual wakes (never deferred) with a backward
// Date.now() step between the third and fourth run. lastRunStartedAtMs always
// equals the newest buffered stamp and nextDueMs always equals
// lastRunStartedAtMs + intervalMs, exactly as recordRunBookkeeping maintains
// them -- unlike the direct-input fixture this replaces, which paired a
// newest buffer entry of now-5s with lastRunStartedAtMs of now-30s and a
// nextDueMs of 0, a combination the scheduler can never produce.
import { afterEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../config/types.openclaw.js";
import { startHeartbeatRunner } from "./heartbeat-runner-scheduler.js";
import { requestHeartbeatAndWait } from "./heartbeat-wake.js";

describe("heartbeat flood guard after a backward clock step (evidence for #156693)", () => {
  let stopRunner: (() => void) | undefined;

  afterEach(() => {
    stopRunner?.();
    stopRunner = undefined;
    vi.useRealTimers();
  });

  function heartbeatConfig(): OpenClawConfig {
    return {
      agents: { defaults: { heartbeat: { every: "30s" } } },
    } as OpenClawConfig;
  }

  // The wake pipeline enqueues on a 0ms timer; the handler observes
  // Date.now() at the requested time (timer fires within the same ms).
  async function wakeAndWait(
    request: Parameters<typeof requestHeartbeatAndWait>[0],
    atMs: number,
    lifecycle?: Parameters<typeof requestHeartbeatAndWait>[1],
  ) {
    vi.setSystemTime(atMs);
    const pending = requestHeartbeatAndWait(request, lifecycle);
    await vi.advanceTimersByTimeAsync(1);
    return pending;
  }

  it("defers an exec-event wake through the registered handler when a clock step scrambles the buffer", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const runOnce = vi.fn().mockResolvedValue({ status: "ran", durationMs: 1 });
    const runner = startHeartbeatRunner({ cfg: heartbeatConfig(), runOnce });
    stopRunner = () => runner.stop();

    const manual = (atMs: number) =>
      wakeAndWait(
        {
          source: "manual",
          intent: "manual",
          reason: "manual",
          agentId: "main",
          coalesceMs: 0,
        },
        atMs,
      );

    // Scheduler-produced run-start sequence. The clock steps backward 25s
    // between the third and fourth run (30000 -> 5000); every stamp below is
    // appended by recordRunStart inside recordRunBookkeeping, and
    // lastRunStartedAtMs tracks the newest stamp exactly. The ring buffer
    // keeps the last 6, so the observed buffer is
    // [20000, 30000, 5000, 25000, 35000, 45000] with the stale 5000 sitting
    // between newer stamps.
    for (const at of [10_000, 20_000, 30_000, 5_000, 25_000, 35_000, 45_000]) {
      const res = await manual(at);
      expect(res.status).toBe("ran");
    }
    expect(runOnce).toHaveBeenCalledTimes(7);

    // now = 75000: past cooldown (45000 + 30000 = 75000, not <) and past the
    // min-spacing floor, so only the flood guard can defer this wake. The 60s
    // window is [15000, 75000]: stamps 20000, 30000, 25000, 35000, 45000 are
    // in-window (the stale 5000 is not) -> 5 >= threshold 5 -> flood.
    // stopWaitingOnRetry settles the waiter with the first deferral decision;
    // the wake itself is retained for its retry deadline.
    const decision = await wakeAndWait(
      {
        source: "exec-event",
        intent: "event",
        reason: "exec-event",
        agentId: "main",
        coalesceMs: 0,
      },
      75_000,
      { stopWaitingOnRetry: () => true },
    );

    // The 5th-newest in-window stamp is 20000, so the retry deadline is
    // 20000 + 60000 + 1 = 80001. A reverse scan that stops at the first
    // out-of-window stamp (the stale 5000) counts only 3 and misses the
    // flood; the fixed guard counts all 5.
    expect(decision).toEqual({
      status: "skipped",
      reason: "flood",
      retryAtMs: 80_001,
    });
    // The burst does not run at the deferral point.
    expect(runOnce).toHaveBeenCalledTimes(7);
  });
});
