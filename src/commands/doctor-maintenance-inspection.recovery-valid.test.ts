import { beforeEach, expect, it, vi } from "vitest";

const readConfigFileSnapshot = vi.hoisted(() => vi.fn());
const assertSessionStoreMigrationComplete = vi.hoisted(() => vi.fn());
const assertOpenClawDatabasesReady = vi.hoisted(() => vi.fn(async () => {}));
const resolveConfiguredAgentDatabaseTargets = vi.hoisted(() => vi.fn(() => []));
const assertConfiguredWorkspaceStateReady = vi.hoisted(() => vi.fn(async () => {}));
const assertNoPendingLegacyExecApprovals = vi.hoisted(() => vi.fn());

vi.mock("../config/config.js", () => ({
  readConfigFileSnapshot,
}));
vi.mock("../config/sessions/startup-migration.js", () => ({
  assertSessionStoreMigrationComplete,
}));
vi.mock("../state/openclaw-database-preflight.js", () => ({
  assertOpenClawDatabasesReady,
}));
vi.mock("../config/sessions/targets.js", () => ({
  resolveConfiguredAgentDatabaseTargets,
}));
vi.mock("../agents/workspace-state-dirs.js", () => ({
  assertConfiguredWorkspaceStateReady,
}));
vi.mock("../infra/exec-approvals-migration-gate.js", () => ({
  assertNoPendingLegacyExecApprovals,
}));

const { readDoctorMaintenanceRecoveryConfig } = await import("./doctor-maintenance-inspection.js");

const resources = { run: async <T>(operation: () => T | Promise<T>) => operation() };
const env = {} as NodeJS.ProcessEnv;
const log = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  assertOpenClawDatabasesReady.mockResolvedValue(undefined);
  assertConfiguredWorkspaceStateReady.mockResolvedValue(undefined);
  resolveConfiguredAgentDatabaseTargets.mockReturnValue([]);
});

it("refuses recovery when saved config snapshot is invalid (malformed JSON5 shape)", async () => {
  readConfigFileSnapshot.mockResolvedValue({
    valid: false,
    config: {},
    path: "/tmp/openclaw-malformed.json",
    raw: "{ gateway: { mode: 'local', ",
    issues: [{ path: "", message: "JSON5 parse error" }],
  });
  await expect(readDoctorMaintenanceRecoveryConfig(resources, env, log)).rejects.toThrow(
    /Doctor recovery config is invalid/,
  );
  expect(assertSessionStoreMigrationComplete).not.toHaveBeenCalled();
  expect(assertOpenClawDatabasesReady).not.toHaveBeenCalled();
});

it("returns config when saved snapshot is valid", async () => {
  const config = { gateway: { mode: "local" } };
  readConfigFileSnapshot.mockResolvedValue({
    valid: true,
    config,
    path: "/tmp/openclaw-valid.json",
    issues: [],
  });
  await expect(readDoctorMaintenanceRecoveryConfig(resources, env, log)).resolves.toBe(config);
  expect(assertSessionStoreMigrationComplete).toHaveBeenCalledOnce();
  expect(assertOpenClawDatabasesReady).toHaveBeenCalledOnce();
});

it("mutation: skipping valid check would call readiness on invalid snapshot", async () => {
  const source = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./doctor-maintenance-inspection.ts", import.meta.url), "utf8"),
  );
  expect(source).toMatch(/if\s*\(\s*!snapshot\.valid\s*\)/);
  expect(source.indexOf("if (!snapshot.valid)")).toBeLessThan(
    source.indexOf("assertDoctorMaintenanceReady(snapshot.config"),
  );

  readConfigFileSnapshot.mockResolvedValue({
    valid: false,
    config: { gateway: { mode: "local" } },
    path: "/tmp/openclaw-malformed.json",
    issues: [{ path: "", message: "JSON5 parse error" }],
  });
  await expect(readDoctorMaintenanceRecoveryConfig(resources, env, log)).rejects.toThrow(
    /Doctor recovery config is invalid/,
  );
  expect(assertSessionStoreMigrationComplete).not.toHaveBeenCalled();
  expect(assertOpenClawDatabasesReady).not.toHaveBeenCalled();
});
