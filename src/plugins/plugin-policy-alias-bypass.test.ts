// Regression: legacy plugin-id aliases must not bypass allow/deny/entries policy.
// Config normalization resolves aliases (e.g. "google-gemini-cli" -> "google") when
// normalizing policy lists, so policy lookups must resolve the same alias. A
// plugin declaring a legacy alias id otherwise evades denylist and per-entry
// disable decisions (fail-open).
import { describe, expect, it } from "vitest";
import { canStartConfiguredChannelPlugin } from "./channel-startup-policy.js";
import { resolvePluginActivationDecisionShared } from "./config-activation-shared.js";
import { createPluginActivationSource, normalizePluginsConfig } from "./config-state.js";
import { blocksPluginStartup } from "./gateway-startup-plugin-config.js";
import { resolveManifestOwnerBasePolicyBlock } from "./manifest-owner-policy.js";

const LEGACY_ALIAS_ID = "Google-Gemini-Cli";

function sharedDecision(id: string, plugins: Record<string, unknown>) {
  return resolvePluginActivationDecisionShared({
    id,
    origin: "workspace",
    config: normalizePluginsConfig(plugins),
    enabledByDefault: true,
    resolveChannelConfigEnablement: () => undefined,
  });
}

describe("legacy alias plugin policy ids", () => {
  it("blocks a legacy alias id via denylist in shared activation policy", () => {
    const normalized = normalizePluginsConfig({ deny: ["google-gemini-cli"] });
    expect(normalized.deny).toEqual(["google"]);
    expect(sharedDecision(LEGACY_ALIAS_ID, { deny: ["google-gemini-cli"] })).toMatchObject({
      enabled: false,
      activated: false,
      cause: "blocked-by-denylist",
    });
  });

  it("blocks a legacy alias id when the canonical id is denied", () => {
    expect(sharedDecision(LEGACY_ALIAS_ID, { deny: ["google"] })).toMatchObject({
      enabled: false,
      cause: "blocked-by-denylist",
    });
  });

  it("honors per-entry disable for a legacy alias id", () => {
    expect(
      sharedDecision(LEGACY_ALIAS_ID, {
        entries: { "Google-Gemini-Cli": { enabled: false } },
      }),
    ).toMatchObject({ enabled: false, cause: "disabled-in-config" });
  });

  it("blocks a legacy alias id in manifest owner policy", () => {
    expect(
      resolveManifestOwnerBasePolicyBlock({
        plugin: { id: LEGACY_ALIAS_ID },
        normalizedConfig: normalizePluginsConfig({ deny: ["google"] }),
      }),
    ).toBe("blocked-by-denylist");
  });

  it("blocks a legacy alias id at gateway startup", () => {
    const pluginsConfig = normalizePluginsConfig({ deny: ["google"] });
    expect(
      blocksPluginStartup({
        pluginId: LEGACY_ALIAS_ID,
        pluginsConfig,
        activationSourcePlugins: pluginsConfig,
      }),
    ).toBe(true);
  });

  it("refuses channel start for a legacy alias id on the denylist", () => {
    const pluginsConfig = normalizePluginsConfig({ deny: ["google"] });
    expect(
      canStartConfiguredChannelPlugin({
        id: LEGACY_ALIAS_ID,
        origin: "bundled",
        config: {},
        pluginsConfig,
        activationSource: createPluginActivationSource({ plugins: pluginsConfig }),
      }),
    ).toBe(false);
  });
});
