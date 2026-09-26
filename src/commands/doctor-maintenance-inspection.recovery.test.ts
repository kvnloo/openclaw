import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DoctorMaintenanceRefusalError } from "../infra/update-doctor-result.js";
import { readDoctorMaintenanceRecoveryConfig } from "./doctor-maintenance-inspection.js";

const HOME_KEY = "HOME";

let savedHome: string | undefined;

function setTempHome(home: string): void {
  savedHome = process.env[HOME_KEY];
  process.env[HOME_KEY] = home;
}

afterEach(() => {
  if (savedHome === undefined) {
    delete process.env[HOME_KEY];
  } else {
    process.env[HOME_KEY] = savedHome;
  }
  savedHome = undefined;
  vi.unstubAllEnvs();
});

async function writeRawConfig(home: string, raw: string): Promise<void> {
  const dir = join(home, ".openclaw");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "openclaw.json"), raw, "utf-8");
}

function testResources() {
  return {
    run: <T>(fn: () => T): T => fn(),
  };
}

describe("readDoctorMaintenanceRecoveryConfig", () => {
  it("fails closed when the saved config is malformed JSON5 instead of returning an empty config", async () => {
    const home = await mkdtemp(join(tmpdir(), "openclaw-doctor-recovery-"));
    setTempHome(home);
    // Truncated object: JSON5 parse failure. The snapshot maps this to
    // valid:false with config:{}, so an unchecked return would hand Gateway
    // restoration an empty config.
    await writeRawConfig(home, '{ "gateway": { "port": 18789, ');

    await expect(
      readDoctorMaintenanceRecoveryConfig(testResources(), {}, { log: () => undefined }),
    ).rejects.toThrow(DoctorMaintenanceRefusalError);
  });

  it("keeps the Gateway stopped signal when the refusal propagates through finish()", async () => {
    const home = await mkdtemp(join(tmpdir(), "openclaw-doctor-recovery-"));
    setTempHome(home);
    await writeRawConfig(home, "{ not valid json5 !!!");

    const refusal = await readDoctorMaintenanceRecoveryConfig(
      testResources(),
      {},
      { log: () => undefined },
    ).catch((error: unknown) => error);

    expect(refusal).toBeInstanceOf(DoctorMaintenanceRefusalError);
    const typed = refusal as DoctorMaintenanceRefusalError;
    expect(typed.refusal.kind).toBe("data-at-risk");
    expect(typed.message).toContain("Gateway stays stopped");
  });

  it("still returns the real config when the saved config is valid (restoration proceeds)", async () => {
    const home = await mkdtemp(join(tmpdir(), "openclaw-doctor-recovery-"));
    setTempHome(home);
    await writeRawConfig(home, JSON.stringify({ gateway: { port: 18789 } }));

    const config = await readDoctorMaintenanceRecoveryConfig(
      testResources(),
      {},
      { log: () => undefined },
    );

    expect(config).toMatchObject({ gateway: { port: 18789 } });
  });
});
