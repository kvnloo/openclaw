# Chunk 20 — health-monitor manual-stop race: patch + test proof

## The defect (found chunk 19, patched here)

`src/gateway/server-channels.ts` clears `manuallyStopped` on every start unless
the caller passes `{ preserveManualStop: true }`:

```ts
if (!preserveManualStop && !store.stops.has(id)) {
  manuallyStopped.delete(rKey);
}
```

Every sibling restart path passes the flag (timed-out recovery continuation,
supervisor auto-restart, crash-loop recovery). The health monitor's restart
(`src/gateway/channel-health-monitor.ts`) called
`startChannel(channelId, accountId)` with **no opts** — the only clearer.

Race: an operator manual-stops the account inside the monitor's
stop -> start window (the stop await can take seconds). The un-flagged start
silently clears the flag and restarts the channel, overriding explicit
operator intent — with no audit-ledger entry.

## The fix (one line)

```ts
await channelManager.startChannel(channelId, accountId, { preserveManualStop: true });
```

With the flag preserved, the start path hits the existing
`manuallyStopped.has(rKey)` guards and reports `skipped` / `manual-stop`
instead of restarting.

## Proof

`src/gateway/channel-health-monitor-manual-stop.test.ts` drives the real
`startChannelHealthMonitor` (fake timers, stale-socket account, injected
ChannelManager) and asserts the restart call carries `{ preserveManualStop: true }`.

- RED on base: `startChannel` called with `("discord", "default")` only — assertion failed.
- GREEN with fix: 1/1 passing.

Test is self-contained (no test-support imports; only repo types + vitest).

## Files

- `src/gateway/channel-health-monitor.ts` — one-line fix (fork base dfbf998e8e6f, diff-minimal)
- `src/gateway/channel-health-monitor-manual-stop.test.ts` — regression test
