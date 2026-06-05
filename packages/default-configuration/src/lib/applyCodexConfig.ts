/**
 * Pure TOML-object helpers for applying the Cards plugin configuration to a
 * Codex `config.toml` parsed object.
 *
 * ### Design
 * All I/O is the caller's responsibility. These helpers take a parsed TOML
 * object (as produced by `smol-toml`'s `parse()`) and return a new object
 * plus the list of segment paths that were written, so callers can record the
 * writes in `InstallManifest` entries for later drift detection.
 *
 * ### Typed segment paths
 * Each written key is described as `Array<{ segment: string; quoted: boolean }>`.
 * A segment is `quoted: true` when it contains `.`, `@`, or other characters
 * that TOML would misinterpret in bare-key notation. This matches the
 * `FileWrite.segments` schema from `agents/types.ts`.
 *
 * @summary Pure TOML-object helpers for applying Codex plugin configuration
 * @module lib/applyCodexConfig
 */

/** A single typed TOML key segment. */
export interface TomlPathSegment {
  /** Raw key string (not TOML-encoded). */
  segment: string;
  /**
   * Whether this segment must be quoted in TOML dotted-key notation.
   * Set `true` for segments containing `.`, `@`, spaces, or other special
   * characters that are not valid in TOML bare keys.
   */
  quoted: boolean;
}

/** A typed TOML key path (array of segments). */
export type TomlPath = TomlPathSegment[];

/** A parsed TOML document (top-level table). */
export type TomlObject = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Plugin marketplace suffix used for the `@local` plugin keys. */
const CODEX_PLUGIN_MARKETPLACE = 'local';

/**
 * Returns `obj[key]` if it is a non-null, non-array plain object, or `{}`
 * when the key is absent. Throws when the key exists but holds a non-table
 * value (fail-closed).
 *
 * @param obj   - Parent TOML table.
 * @param key   - Key to read.
 * @param label - Human-readable path label for error messages.
 * @returns The nested table (possibly empty).
 * @throws {Error} When the key exists but is not a TOML table.
 */
function getOrCreateTable(obj: TomlObject, key: string, label: string): TomlObject {
  const existing = obj[key];

  if (existing === undefined || existing === null) {
    return {};
  }

  if (typeof existing !== 'object' || Array.isArray(existing)) {
    throw new Error(`Expected TOML table at "${label}", got ${Array.isArray(existing) ? 'array' : typeof existing}`);
  }

  return existing as TomlObject;
}

// ---------------------------------------------------------------------------
// applyCodexConfig
// ---------------------------------------------------------------------------

/**
 * Options for `applyCodexConfig`.
 */
export interface ApplyCodexConfigOptions {
  /**
   * Plugin identifiers to enable. Each entry causes the corresponding
   * `plugins."<entry>@local".enabled = true` key to be set.
   *
   * Pass `['cards@local', 'runtime@local']` to match the existing
   * `mergeCodexRuntimeConfig` behavior.
   */
  enablePlugins: Array<'cards@local' | 'runtime@local'>;

  /**
   * When `true`, sets `features.plugins = true`. When `false`, sets it to
   * `false` (explicit opt-out). Required parameter — callers must decide.
   */
  featuresPlugins: boolean;

  /**
   * Optional map of project-root → trust level to write into `projects`.
   * When present, each entry sets `projects."<repoRoot>".trust_level = "trusted"`.
   * Omit for user-scope installs (no project trust needed).
   */
  trustProjects?: Record<string, 'trusted'>;
}

/**
 * Result returned by `applyCodexConfig`.
 */
export interface ApplyCodexConfigResult {
  /** The modified TOML object (a new shallow copy of `parsedToml`). */
  result: TomlObject;
  /**
   * Typed TOML key paths that were written, in application order.
   * Suitable for recording as `FileWrite.segments` entries in an
   * `InstallManifest`.
   */
  touchedSegments: TomlPath[];
}

/**
 * Applies Cards plugin configuration to a parsed Codex `config.toml` object.
 *
 * This is a **pure function** — no file I/O. The caller is responsible for
 * reading the source file, parsing it with `smol-toml`, calling this helper,
 * serialising the result back with `smol-toml`, and writing the file.
 *
 * Writes performed:
 * 1. `features.plugins = <featuresPlugins>`
 * 2. For each entry in `enablePlugins`: `plugins."<entry>".enabled = true`
 *    (where `<entry>` is e.g. `cards@local`)
 * 3. For each entry in `trustProjects` (if present):
 *    `projects."<repoRoot>".trust_level = "trusted"`
 *
 * @param parsedToml - Parsed TOML document. Not mutated — a shallow copy of
 *                     the top level is returned.
 * @param options    - Configuration to apply.
 * @returns `{ result, touchedSegments }` where `result` is the updated object
 *          and `touchedSegments` lists each path that was written.
 * @throws {Error} When an expected TOML table key exists but holds a non-table
 *                 value (e.g. an array or scalar).
 */
export function applyCodexConfig(parsedToml: TomlObject, options: ApplyCodexConfigOptions): ApplyCodexConfigResult {
  const { enablePlugins, featuresPlugins, trustProjects } = options;

  // Work on a shallow copy of the top level so we do not mutate the caller's
  // object. Nested tables are cloned when we modify them.
  const result: TomlObject = { ...parsedToml };
  const touchedSegments: TomlPath[] = [];

  // 1. features.plugins
  const features = { ...getOrCreateTable(result, 'features', 'features') };
  features['plugins'] = featuresPlugins;
  result['features'] = features;
  touchedSegments.push([
    { segment: 'features', quoted: false },
    { segment: 'plugins', quoted: false }
  ]);

  // 2. plugins."<name>".enabled
  const plugins = { ...getOrCreateTable(result, 'plugins', 'plugins') };

  for (const pluginEntry of enablePlugins) {
    // pluginEntry is e.g. 'cards@local'. The key in the TOML file is the
    // full string (e.g. 'cards@local') — smol-toml preserves quoted keys.
    // We also strip the '@local' suffix here to verify the format and build
    // the plugin key.
    if (!pluginEntry.endsWith(`@${CODEX_PLUGIN_MARKETPLACE}`)) {
      throw new Error(`Unexpected plugin entry "${pluginEntry}" — expected "<name>@${CODEX_PLUGIN_MARKETPLACE}"`);
    }

    const pluginTable = { ...getOrCreateTable(plugins, pluginEntry, `plugins.${pluginEntry}`) };
    pluginTable['enabled'] = true;
    plugins[pluginEntry] = pluginTable;

    touchedSegments.push([
      { segment: 'plugins', quoted: false },
      { segment: pluginEntry, quoted: true },
      { segment: 'enabled', quoted: false }
    ]);
  }
  result['plugins'] = plugins;

  // 3. projects."<repoRoot>".trust_level (optional)
  if (trustProjects !== undefined) {
    const projects = { ...getOrCreateTable(result, 'projects', 'projects') };

    for (const [repoRoot, trustLevel] of Object.entries(trustProjects)) {
      const projectEntry = { ...getOrCreateTable(projects, repoRoot, `projects.${repoRoot}`) };
      projectEntry['trust_level'] = trustLevel;
      projects[repoRoot] = projectEntry;

      touchedSegments.push([
        { segment: 'projects', quoted: false },
        { segment: repoRoot, quoted: true },
        { segment: 'trust_level', quoted: false }
      ]);
    }

    result['projects'] = projects;
  }

  return { result, touchedSegments };
}
