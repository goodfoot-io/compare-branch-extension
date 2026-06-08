/**
 * Structural invariance tests for `applyCodexConfig`.
 *
 * These tests verify that `applyCodexConfig` produces the same structural
 * outcome as the inline logic that previously lived in the now-removed
 * `mergeCodexRuntimeConfig`. `applyCodexConfig` now generates the contents of
 * the Cards profile-v2 file (`${CODEX_HOME}/cards.config.toml`) written by
 * `writeCodexProfileConfig`, so this `features`/`plugins` tree is the exact
 * enablement codex reads from that separate User-config layer.
 *
 * Non-tracked keys (whitespace, key ordering, TOML comments) are explicitly
 * ignored — only the `features`, `plugins`, and `projects` subtrees are
 * compared with deep equality after a round-trip through `smol-toml`.
 *
 * ### Fixtures
 * Three representative starting states:
 * 1. Empty config (`{}`) — baseline.
 * 2. Config with `features.plugins = false` already present.
 * 3. Config with `plugins."cards@local".enabled = false` already present.
 *
 * For each fixture the test applies `applyCodexConfig` with
 * `enablePlugins: ['cards@local', 'runtime@local']` and `featuresPlugins: true`
 * (the same options `mergeCodexRuntimeConfig` used before it was removed) and
 * verifies the expected structure is present.
 *
 * @summary Structural invariance tests for applyCodexConfig
 */

import { parse as parseToml, stringify as stringifyToml } from 'smol-toml';
import { describe, expect, it } from 'vitest';
import { applyCodexConfig } from '../src/lib/applyCodexConfig.js';

// ---------------------------------------------------------------------------
// Helper: extract the relevant subtrees from a TOML round-trip
// ---------------------------------------------------------------------------

interface RelevantSubtrees {
  features: Record<string, unknown>;
  plugins: Record<string, unknown>;
  projects: Record<string, unknown>;
}

function parseRelevant(toml: Record<string, unknown>): RelevantSubtrees {
  // Round-trip through smol-toml to get byte-comparable shapes.
  const serialised = `${stringifyToml(toml)}\n`;
  const parsed = parseToml(serialised) as Record<string, unknown>;

  return {
    features: (parsed['features'] as Record<string, unknown>) ?? {},
    plugins: (parsed['plugins'] as Record<string, unknown>) ?? {},
    projects: (parsed['projects'] as Record<string, unknown>) ?? {}
  };
}

// ---------------------------------------------------------------------------
// Expected outcome after applying the (now-removed) mergeCodexRuntimeConfig-equivalent options
// ---------------------------------------------------------------------------

const EXPECTED_FEATURES = { plugins: true };
const EXPECTED_PLUGINS = {
  'cards@local': { enabled: true },
  'runtime@local': { enabled: true }
};

// ---------------------------------------------------------------------------
// Fixture 1: empty config
// ---------------------------------------------------------------------------

describe('applyCodexConfig — fixture: empty config', () => {
  it('sets features.plugins = true', () => {
    const { result } = applyCodexConfig(
      {},
      {
        enablePlugins: ['cards@local', 'runtime@local'],
        featuresPlugins: true
      }
    );
    const { features, plugins } = parseRelevant(result);
    expect(features).toEqual(EXPECTED_FEATURES);
    expect(plugins).toEqual(EXPECTED_PLUGINS);
  });

  it('returns touchedSegments for all written paths', () => {
    const { touchedSegments } = applyCodexConfig(
      {},
      {
        enablePlugins: ['cards@local', 'runtime@local'],
        featuresPlugins: true
      }
    );
    // features.plugins + plugins."cards@local".enabled + plugins."runtime@local".enabled
    expect(touchedSegments).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Fixture 2: features.plugins already false
// ---------------------------------------------------------------------------

describe('applyCodexConfig — fixture: features.plugins = false', () => {
  const fixture = parseToml('[features]\nplugins = false\n') as Record<string, unknown>;

  it('overwrites features.plugins to true', () => {
    const { result } = applyCodexConfig(fixture, {
      enablePlugins: ['cards@local', 'runtime@local'],
      featuresPlugins: true
    });
    const { features, plugins } = parseRelevant(result);
    expect(features).toEqual(EXPECTED_FEATURES);
    expect(plugins).toEqual(EXPECTED_PLUGINS);
  });

  it('does not mutate the input object', () => {
    const before = JSON.stringify(fixture);
    applyCodexConfig(fixture, {
      enablePlugins: ['cards@local', 'runtime@local'],
      featuresPlugins: true
    });
    expect(JSON.stringify(fixture)).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// Fixture 3: plugins."cards@local".enabled = false already set
// ---------------------------------------------------------------------------

describe('applyCodexConfig — fixture: cards@local enabled = false', () => {
  const fixture = parseToml('[plugins."cards@local"]\nenabled = false\n') as Record<string, unknown>;

  it('overwrites enabled to true and adds runtime@local', () => {
    const { result } = applyCodexConfig(fixture, {
      enablePlugins: ['cards@local', 'runtime@local'],
      featuresPlugins: true
    });
    const { features, plugins } = parseRelevant(result);
    expect(features).toEqual(EXPECTED_FEATURES);
    expect(plugins).toEqual(EXPECTED_PLUGINS);
  });
});

// ---------------------------------------------------------------------------
// Fixture 4: selective enablePlugins (only cards@local)
// ---------------------------------------------------------------------------

describe('applyCodexConfig — selective enablePlugins', () => {
  it('enables only the specified plugins', () => {
    const { result } = applyCodexConfig(
      {},
      {
        enablePlugins: ['cards@local'],
        featuresPlugins: true
      }
    );
    const { plugins } = parseRelevant(result);
    expect(plugins['cards@local']).toEqual({ enabled: true });
    expect(plugins['runtime@local']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Fixture 5: featuresPlugins = false (explicit opt-out)
// ---------------------------------------------------------------------------

describe('applyCodexConfig — featuresPlugins: false', () => {
  it('sets features.plugins = false', () => {
    const { result } = applyCodexConfig(
      {},
      {
        enablePlugins: [],
        featuresPlugins: false
      }
    );
    const { features } = parseRelevant(result);
    expect(features['plugins']).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Fixture 6: trustProjects
// ---------------------------------------------------------------------------

describe('applyCodexConfig — trustProjects', () => {
  it('writes projects."<repoRoot>".trust_level = "trusted"', () => {
    const repoRoot = '/home/user/myproject';
    const { result, touchedSegments } = applyCodexConfig(
      {},
      {
        enablePlugins: ['cards@local', 'runtime@local'],
        featuresPlugins: true,
        trustProjects: { [repoRoot]: 'trusted' }
      }
    );
    const { projects } = parseRelevant(result);
    expect(projects[repoRoot]).toEqual({ trust_level: 'trusted' });
    // touchedSegments: features.plugins + cards@local.enabled + runtime@local.enabled + trust key
    expect(touchedSegments).toHaveLength(4);
    const trustSeg = touchedSegments[3]!;
    expect(trustSeg[0]).toEqual({ segment: 'projects', quoted: false });
    expect(trustSeg[1]).toEqual({ segment: repoRoot, quoted: true });
    expect(trustSeg[2]).toEqual({ segment: 'trust_level', quoted: false });
  });

  it('does not touch projects when trustProjects is omitted', () => {
    const { result } = applyCodexConfig(
      {},
      {
        enablePlugins: ['cards@local', 'runtime@local'],
        featuresPlugins: true
      }
    );
    const { projects } = parseRelevant(result);
    expect(projects).toEqual({});
  });

  it('preserves existing unrelated project entries', () => {
    const fixture = parseToml('[projects."other-project"]\ntrust_level = "trusted"\n') as Record<string, unknown>;
    const repoRoot = '/home/user/myproject';
    const { result } = applyCodexConfig(fixture, {
      enablePlugins: [],
      featuresPlugins: true,
      trustProjects: { [repoRoot]: 'trusted' }
    });
    const { projects } = parseRelevant(result);
    expect(projects['other-project']).toEqual({ trust_level: 'trusted' });
    expect(projects[repoRoot]).toEqual({ trust_level: 'trusted' });
  });
});
