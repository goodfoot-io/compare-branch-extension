/**
 * Tests for the OpenCode shared state: root-session registry, the CONTRACT-C
 * NDJSON exporter (including torn-tail healing), and the hooks log anchor.
 *
 * @summary Tests for opencode-state registry, exporter, and log anchor
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createRootSessionRegistry,
  createTranscriptExporter,
  defaultOpencodeStateIo,
  recordsCardsPluginInstall,
  resolveHookLogFile,
  resolveLogAnchorRoot
} from '../../src/opencode/opencode-state.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'opencode-state-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('root session registry', () => {
  it('registers sessions without a parentID as roots', () => {
    const registry = createRootSessionRegistry();
    registry.observe({ id: 'ses-root' });
    expect(registry.isRoot('ses-root')).toBe(true);
    expect(registry.size).toBe(1);
  });

  it('ignores child sessions carrying a parentID', () => {
    const registry = createRootSessionRegistry();
    registry.observe({ id: 'ses-child', parentID: 'ses-root' });
    expect(registry.isRoot('ses-child')).toBe(false);
    expect(registry.size).toBe(0);
  });

  it('forgets sessions and preserves first-seen order', () => {
    const registry = createRootSessionRegistry();
    registry.observe({ id: 'ses-a' });
    registry.observe({ id: 'ses-b' });
    registry.observe({ id: 'ses-c' });
    registry.forget('ses-b');
    expect(registry.rootIds()).toEqual(['ses-a', 'ses-c']);
    expect(registry.isRoot('ses-b')).toBe(false);
  });

  it('deduplicates repeated observes of the same root', () => {
    const registry = createRootSessionRegistry();
    registry.observe({ id: 'ses-a' });
    registry.observe({ id: 'ses-a' });
    expect(registry.size).toBe(1);
  });
});

describe('CONTRACT-C transcript exporter', () => {
  const io = defaultOpencodeStateIo;

  function readLines(path: string): Array<Record<string, unknown>> {
    // Mirrors CONTRACT-C reader tolerance: torn/unparseable lines are skipped.
    return readFileSync(path, 'utf8')
      .split('\n')
      .filter((line) => line.length > 0)
      .flatMap((line) => {
        try {
          return [JSON.parse(line) as Record<string, unknown>];
        } catch {
          return [];
        }
      });
  }

  it('writes the meta line first with runtime identity and incrementing seq', () => {
    const path = join(tempDir, 'ses-1.jsonl');
    const exporter = createTranscriptExporter('ses-1', path, io);
    exporter.writeMeta({ runtime: 'opencode', opencodeVersion: '1.18.21' });
    exporter.writePart({ id: 'prt-1' });

    const lines = readLines(path);
    expect(lines).toHaveLength(2);

    expect(lines[0]).toMatchObject({
      v: 1,
      seq: 1,
      sessionId: 'ses-1',
      type: 'meta',
      data: { runtime: 'opencode', opencodeVersion: '1.18.21' }
    });
    expect(typeof lines[0]?.['ts']).toBe('string');

    expect(lines[1]).toMatchObject({ v: 1, seq: 2, sessionId: 'ses-1', type: 'part' });
    expect(exporter.seq).toBe(2);
  });

  it('serializes message payloads with the message type', () => {
    const path = join(tempDir, 'ses-2.jsonl');
    const exporter = createTranscriptExporter('ses-2', path, io);
    exporter.writeMessage({ id: 'msg-1' });
    const lines = readLines(path);
    expect(lines[0]).toMatchObject({ type: 'message', data: { id: 'msg-1' } });
  });

  it('heals a torn trailing line by prefixing a newline before the next append', () => {
    const path = join(tempDir, 'ses-3.jsonl');
    writeFileSync(path, '{"v":1,"ts":"torn","seq":9,"sessionId":"ses-3","type":"part","dat');
    const exporter = createTranscriptExporter('ses-3', path, io);
    exporter.writeMeta({ runtime: 'opencode', opencodeVersion: '1.18.21' });

    // The torn fragment stays on its own line; the new record starts clean.
    const raw = readFileSync(path, 'utf8');
    expect(raw.startsWith('{"v":1,"ts":"torn"')).toBe(true);
    expect(raw).toContain('\n{"v":1');

    // A tolerant reader drops the torn fragment and keeps every new record.
    const lines = readLines(path);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ seq: 1, type: 'meta' });
  });

  it('does not insert separators when the file already ends with a newline', () => {
    const path = join(tempDir, 'ses-4.jsonl');
    writeFileSync(path, '{"v":1,"ok":true}\n');
    const exporter = createTranscriptExporter('ses-4', path, io);
    exporter.writeMeta({});
    const raw = readFileSync(path, 'utf8');
    expect(raw).not.toContain('\n\n');
    expect(readLines(path)).toHaveLength(2);
  });

  it('stops writing after close', () => {
    const path = join(tempDir, 'ses-5.jsonl');
    const exporter = createTranscriptExporter('ses-5', path, io);
    exporter.writeMeta({});
    exporter.close();
    exporter.writePart({ late: true });
    expect(readLines(path)).toHaveLength(1);
  });

  it('creates the parent directory on demand', () => {
    const path = join(tempDir, 'nested', 'deeper', 'ses-6.jsonl');
    const exporter = createTranscriptExporter('ses-6', path, io);
    exporter.writeMeta({});
    expect(io.fileSizeSync(path)).toBeGreaterThan(0);
  });
});

describe('hooks log anchor resolution', () => {
  const io = defaultOpencodeStateIo;
  const mainRoot = '/repo/main';
  /** IO whose git lookup reports fixed roots (no git subprocess in tests). */
  const ioWithRoots = { ...io, gitRoots: () => ({ worktreeRoot: tempDir, mainRepoRoot: mainRoot }) };
  /** IO outside any repository. */
  const ioNoRepo = { ...io, gitRoots: () => null };

  it('honors an explicit OPENCODE_CARDS_HOOKS_LOG_FILE override', () => {
    const env = { OPENCODE_CARDS_HOOKS_LOG_FILE: '/tmp/override.log' } as NodeJS.ProcessEnv;
    expect(resolveHookLogFile(ioNoRepo, env, '/nowhere')).toBe('/tmp/override.log');
    expect(resolveHookLogFile(ioNoRepo, env, '/nowhere')).toContain('override.log');
  });

  it('treats an empty override as logging off', () => {
    const env = { OPENCODE_CARDS_HOOKS_LOG_FILE: '' } as NodeJS.ProcessEnv;
    expect(resolveHookLogFile(ioNoRepo, env, '/nowhere')).toBeNull();
  });

  it('resolves no anchor when nothing indicates a Cards install', () => {
    expect(resolveHookLogFile(ioNoRepo, {} as NodeJS.ProcessEnv, '/nowhere')).toBeNull();
  });

  it('anchors on the main repo root for a launch-time staged config listing cards plugins', () => {
    const stagedConfig = join(tempDir, 'staged.config.json');
    writeFileSync(
      stagedConfig,
      JSON.stringify({ plugin: ['/home/u/.cards/opencode/plugins/cache/cards/runtime/current.mjs'] })
    );
    const anchor = resolveLogAnchorRoot(ioWithRoots, { OPENCODE_CONFIG: stagedConfig } as NodeJS.ProcessEnv, tempDir);
    expect(anchor).toBe(mainRoot);
  });

  it('anchors on the main repo root for a project-scope install in .opencode/opencode.json', () => {
    const projectConfig = join(tempDir, '.opencode', 'opencode.json');
    defaultOpencodeStateIo.ensureDirSync(join(tempDir, '.opencode'));
    writeFileSync(projectConfig, JSON.stringify({ plugin: ['y/plugins/cache/cards/cards/current.mjs'] }));

    const anchor = resolveLogAnchorRoot(ioWithRoots, {} as NodeJS.ProcessEnv, tempDir);
    expect(anchor).toBe(mainRoot);
  });

  it('anchors on the home directory for a user-scope install in the global config', () => {
    const globalDir = join(tempDir, 'global-opencode');
    defaultOpencodeStateIo.ensureDirSync(globalDir);
    writeFileSync(join(globalDir, 'opencode.json'), JSON.stringify({ plugin: ['cards-opencode-runtime'] }));
    const anchor = resolveLogAnchorRoot(
      ioNoRepo,
      { OPENCODE_CONFIG_DIR: globalDir } as NodeJS.ProcessEnv,
      '/some/checkout'
    );
    expect(anchor).toBe(defaultOpencodeStateIo.homedir());
  });

  it('parses comment-bearing .jsonc configs when detecting installs', () => {
    const stagedConfig = join(tempDir, 'staged.jsonc');
    writeFileSync(
      stagedConfig,
      [
        '{',
        '  // cards launch staging written by the extension',
        '  "plugin": [',
        '    "/home/u/.cards/opencode/plugins/cache/cards/runtime/current.mjs", /* trailing block */',
        '  ],',
        '}'
      ].join('\n')
    );
    const anchor = resolveLogAnchorRoot(ioWithRoots, { OPENCODE_CONFIG: stagedConfig } as NodeJS.ProcessEnv, tempDir);
    expect(anchor).toBe(mainRoot);
  });
});

describe('recordsCardsPluginInstall', () => {
  it.each([
    ['a cache pointer file', { plugin: ['/h/.config/opencode/plugins/cache/cards/cards/current.mjs'] }, true],
    ['an npm-style package name', { plugin: ['cards-opencode-runtime'] }, true],
    ['a tuple entry', { plugin: [['/x/plugins/cache/cards/runtime/current.mjs', {}]] }, true],
    [
      'a launch-staged absolute path',
      { plugin: ['/home/u/.cards/opencode/plugins/cache/cards/runtime/plugin/session-start.mjs'] },
      true
    ],
    ['unrelated plugins only', { plugin: ['./my-plugin.ts'] }, false],
    ['a config without the plugin key', {}, false]
  ])('detects %s', (_label, config, expected) => {
    expect(recordsCardsPluginInstall(config)).toBe(expected);
  });
});
