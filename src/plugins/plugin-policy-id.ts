// Derives the canonical key used to match plugin ids against config policy lists.
import { normalizeOptionalLowercaseString } from "@openclaw/normalization-core/string-coerce";

/**
 * Legacy config ids that resolve to their current plugin id. Config policy lists
 * (`plugins.allow`, `plugins.deny`, `plugins.entries` keys) are normalized with
 * alias resolution, so every policy lookup must resolve the same alias. Otherwise
 * a plugin declaring a legacy id silently escapes operator policy (fail-open).
 */
const BUILT_IN_PLUGIN_ALIAS_FALLBACKS: ReadonlyArray<readonly [alias: string, pluginId: string]> = [
  ["google-gemini-cli", "google"],
  ["minimax-portal", "minimax"],
  ["minimax-portal-auth", "minimax"],
] as const;

const BUILT_IN_PLUGIN_ALIAS_LOOKUP = new Map<string, string>([
  ...BUILT_IN_PLUGIN_ALIAS_FALLBACKS,
  ...BUILT_IN_PLUGIN_ALIAS_FALLBACKS.map(([, pluginId]) => [pluginId, pluginId] as const),
]);

/** Resolves a legacy plugin id alias to its current plugin id (identity for unknown ids). */
export function resolvePluginIdAlias(normalizedId: string): string {
  return BUILT_IN_PLUGIN_ALIAS_LOOKUP.get(normalizedId) ?? normalizedId;
}

/**
 * Canonicalizes a plugin id for comparison against `plugins.allow`, `plugins.deny`, and
 * `plugins.entries`, which are alias-resolved when config is normalized. A manifest declares
 * its id in whatever case its author chose, so policy must compare this derived key rather than the
 * declared id. The declared id itself stays untouched: the loader matches it against the plugin's
 * runtime export id, and rewriting it would break plugins whose export matches a mixed-case manifest.
 */
export function normalizePluginPolicyId(id: string): string {
  return resolvePluginIdAlias(normalizeOptionalLowercaseString(id) ?? "");
}
