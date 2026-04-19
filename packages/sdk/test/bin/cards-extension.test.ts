/**
 * Tests for the `cards-extension` CLI dispatcher and its subcommand handlers.
 *
 * Every test calls an exported function (`main` / `runAttribution` / `runNotify`)
 * directly and asserts on the returned number. No `process.argv` mutation,
 * no `vi.resetModules`, no child-process spawn. `CardsClient`, `discoverApiInfo`,
 * and the global `fetch` are stubbed at module boundaries.
 *
 * @summary Behavioral tests for the cards-extension CLI
 */

import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSetCompare, mockGetCompare, mockClearCompare, mockDiscoverApiInfo } = vi.hoisted(() => ({
  mockSetCompare: vi.fn(),
  mockGetCompare: vi.fn(),
  mockClearCompare: vi.fn(),
  mockDiscoverApiInfo: vi.fn()
}));

vi.mock('@cards/sdk/client', () => {
  class CardsClient {
    setCompare = mockSetCompare;
    getCompare = mockGetCompare;
    clearCompare = mockClearCompare;
  }
  return { CardsClient };
});

vi.mock('@cards/sdk/client/discovery', () => {
  return {
    discoverApiInfo: mockDiscoverApiInfo
  };
});

import { runAttribution } from '../../src/bin/cards-extension/attribution.js';
import { runNotify } from '../../src/bin/cards-extension/notify.js';
import { main } from '../../src/bin/cards-extension.js';

const apiInfoFixture = {
  host: '127.0.0.1',
  port: 12345,
  accessToken: 'test-token'
};

/**
 * Replace process.stdin with a Readable that yields the given payload.
 *
 * @param payload - Raw text to feed attribute `set` handler via stdin.
 * @returns Restore callback that reinstates the original process.stdin.
 */
function mockStdin(payload: string): () => void {
  const original = process.stdin;
  const stream = Readable.from([Buffer.from(payload, 'utf-8')]);
  Object.defineProperty(process, 'stdin', { value: stream, configurable: true });
  return () => {
    Object.defineProperty(process, 'stdin', { value: original, configurable: true });
  };
}

type ConsoleSpy = ReturnType<typeof vi.spyOn>;

/**
 * Concatenate all first-argument strings written to a spied console method.
 *
 * @param spy - Vitest console spy.
 * @returns All captured first-argument outputs joined with newlines.
 */
function collectOutput(spy: ConsoleSpy): string {
  return spy.mock.calls.map((c: unknown[]) => c.map(String).join(' ')).join('\n');
}

describe('cards-extension dispatcher (main)', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    stdoutSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockSetCompare.mockReset();
    mockGetCompare.mockReset();
    mockClearCompare.mockReset();
    mockDiscoverApiInfo.mockReset();
    mockDiscoverApiInfo.mockResolvedValue(apiInfoFixture);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    stdoutSpy.mockRestore();
  });

  it('unknown top-level subcommand returns 1 and prints "unknown command"', async () => {
    const code = await main(['not-a-thing']);
    expect(code).toBe(1);
    const calls = collectOutput(stderrSpy);
    expect(calls).toContain('unknown command');
    expect(calls).toContain('not-a-thing');
  });

  it('missing top-level subcommand returns 1 and prints HELP to stderr', async () => {
    const code = await main([]);
    expect(code).toBe(1);
    const calls = collectOutput(stderrSpy);
    expect(calls).toContain('cards-extension <subcommand>');
  });

  it('--help returns 0 and prints HELP to stdout', async () => {
    const code = await main(['--help']);
    expect(code).toBe(0);
    const calls = collectOutput(stdoutSpy);
    expect(calls).toContain('cards-extension <subcommand>');
  });

  it('-h returns 0 and prints HELP to stdout', async () => {
    const code = await main(['-h']);
    expect(code).toBe(0);
    const calls = collectOutput(stdoutSpy);
    expect(calls).toContain('cards-extension <subcommand>');
  });

  it('attribution routes to the attribution handler', async () => {
    // Attribution subcommand with no sub-sub-command returns 1 and prints subcommand HELP to stderr.
    const code = await main(['attribution']);
    expect(code).toBe(1);
    const calls = collectOutput(stderrSpy);
    expect(calls).toContain('cards-extension attribution');
  });

  it('notify routes to the notify handler', async () => {
    // Missing required flags; notify handler returns 1 with its own "cards-extension notify:" stderr prefix.
    const code = await main(['notify']);
    expect(code).toBe(1);
    const calls = collectOutput(stderrSpy);
    expect(calls).toContain('cards-extension notify:');
    expect(calls).toContain('--type');
  });

  it('thrown error from a handler is caught and returns 1 with stderr message', async () => {
    mockDiscoverApiInfo.mockRejectedValueOnce(new Error('boom-discovery'));
    const code = await main(['attribution', 'get']);
    expect(code).toBe(1);
    const calls = collectOutput(stderrSpy);
    expect(calls).toContain('boom-discovery');
  });
});

describe('runAttribution handler', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    stdoutSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockSetCompare.mockReset();
    mockGetCompare.mockReset();
    mockClearCompare.mockReset();
    mockDiscoverApiInfo.mockReset();
    mockDiscoverApiInfo.mockResolvedValue(apiInfoFixture);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    stdoutSpy.mockRestore();
  });

  it('unknown attribution subcommand returns 1 and mentions cards-extension attribution', async () => {
    const code = await runAttribution(['bogus']);
    expect(code).toBe(1);
    const calls = collectOutput(stderrSpy);
    expect(calls).toContain('cards-extension attribution');
    expect(calls).toContain('bogus');
  });

  it('attribution --help returns 0 and prints subcommand HELP to stdout', async () => {
    const code = await runAttribution(['--help']);
    expect(code).toBe(0);
    const calls = collectOutput(stdoutSpy);
    expect(calls).toContain('cards-extension attribution');
  });

  it('attribution clear --help returns 0 and does not call clearCompare', async () => {
    const code = await runAttribution(['clear', '--help']);
    expect(code).toBe(0);
    expect(mockClearCompare).not.toHaveBeenCalled();
    const stdout = collectOutput(stdoutSpy);
    expect(stdout).toContain('cards-extension attribution');
    expect(stdout).toContain('Clear');
  });

  it('attribution get --help returns 0 and does not call getCompare', async () => {
    const code = await runAttribution(['get', '--help']);
    expect(code).toBe(0);
    expect(mockGetCompare).not.toHaveBeenCalled();
    const stdout = collectOutput(stdoutSpy);
    expect(stdout).toContain('cards-extension attribution');
  });

  it('attribution set --help returns 0 without reading stdin and without calling setCompare', async () => {
    // No stdin fixture provided. If the handler tried to read stdin it would hang indefinitely;
    // awaiting here proves the help check short-circuits before the stdin read.
    const code = await runAttribution(['set', '--help']);
    expect(code).toBe(0);
    expect(mockSetCompare).not.toHaveBeenCalled();
    const stdout = collectOutput(stdoutSpy);
    expect(stdout).toContain('cards-extension attribution');
  });

  it('attribution set -h returns 0 without reading stdin and without calling setCompare', async () => {
    const code = await runAttribution(['set', '-h']);
    expect(code).toBe(0);
    expect(mockSetCompare).not.toHaveBeenCalled();
    const stdout = collectOutput(stdoutSpy);
    expect(stdout).toContain('cards-extension attribution');
  });

  it('attribution set — branch range — passes parsed object to setCompare', async () => {
    const request = { baseRef: 'main', compareRef: 'feature/x' };
    const resultState = { id: 'compare-1', ...request };
    mockSetCompare.mockResolvedValueOnce(resultState);

    const restore = mockStdin(JSON.stringify(request));
    const code = await runAttribution(['set']);
    restore();

    expect(code).toBe(0);
    expect(mockSetCompare).toHaveBeenCalledWith(request);
    const stdout = collectOutput(stdoutSpy);
    expect(stdout).toContain('compare-1');
  });

  it('attribution set — dynamic worktree — passes parsed object to setCompare', async () => {
    const request = { baseRef: 'main', repositoryPath: '/path/to/repo' };
    mockSetCompare.mockResolvedValueOnce({ ok: true });

    const restore = mockStdin(JSON.stringify(request));
    const code = await runAttribution(['set']);
    restore();

    expect(code).toBe(0);
    expect(mockSetCompare).toHaveBeenCalledWith(request);
  });

  it('attribution set — fixed attribution — passes parsed object to setCompare', async () => {
    const request = { compareRef: 'feature/x', attributionShas: ['abc'] };
    mockSetCompare.mockResolvedValueOnce({ ok: true });

    const restore = mockStdin(JSON.stringify(request));
    const code = await runAttribution(['set']);
    restore();

    expect(code).toBe(0);
    expect(mockSetCompare).toHaveBeenCalledWith(request);
  });

  it('attribution set — empty stdin — returns 1 and stderr includes "expected JSON on stdin"', async () => {
    const restore = mockStdin('');
    const code = await runAttribution(['set']);
    restore();
    expect(code).toBe(1);
    expect(collectOutput(stderrSpy)).toContain('expected JSON on stdin');
  });

  it('attribution set — malformed JSON — returns 1 and stderr includes "invalid JSON on stdin"', async () => {
    const restore = mockStdin('not-json');
    const code = await runAttribution(['set']);
    restore();
    expect(code).toBe(1);
    expect(collectOutput(stderrSpy)).toContain('invalid JSON on stdin');
  });

  it('attribution get — active state — prints JSON state to stdout and returns 0', async () => {
    const state = { id: 'compare-42', baseRef: 'main', compareRef: 'feat' };
    mockGetCompare.mockResolvedValueOnce(state);

    const code = await runAttribution(['get']);

    expect(code).toBe(0);
    const stdout = collectOutput(stdoutSpy);
    expect(stdout).toContain('compare-42');
  });

  it('attribution get — no active — prints "No active comparison" and returns 0', async () => {
    mockGetCompare.mockResolvedValueOnce(null);

    const code = await runAttribution(['get']);

    expect(code).toBe(0);
    const stdout = collectOutput(stdoutSpy);
    expect(stdout).toContain('No active comparison');
  });

  it('attribution clear — invokes clearCompare and prints success JSON', async () => {
    mockClearCompare.mockResolvedValueOnce(undefined);

    const code = await runAttribution(['clear']);

    expect(code).toBe(0);
    expect(mockClearCompare).toHaveBeenCalledTimes(1);
    const stdout = collectOutput(stdoutSpy);
    expect(stdout).toContain('"success":true');
  });

  it('discovery failure — returns null from discoverApiInfo — returns 1 and stderr includes discovery message', async () => {
    mockDiscoverApiInfo.mockResolvedValueOnce(null);

    const code = await runAttribution(['get']);
    expect(code).toBe(1);
    expect(collectOutput(stderrSpy)).toContain('API discovery failed');
  });
});

describe('runNotify handler', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  const mockFetch = vi.fn();

  beforeEach(() => {
    stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    stdoutSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockDiscoverApiInfo.mockReset();
    mockDiscoverApiInfo.mockResolvedValue(apiInfoFixture);
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    stdoutSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('notify --help returns 0 and prints subcommand HELP to stdout', async () => {
    const code = await runNotify(['--help']);
    expect(code).toBe(0);
    const stdout = collectOutput(stdoutSpy);
    expect(stdout).toContain('cards-extension notify');
  });

  it('notify --help wins over provided flags — no fetch call, returns 0', async () => {
    const code = await runNotify(['--help', '--type', 'info', '--title', 't', '--message', 'm', '--source', 's']);
    expect(code).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
    const stdout = collectOutput(stdoutSpy);
    expect(stdout).toContain('cards-extension notify');
  });

  it('happy path — all four flags — POSTs correct body and returns 0', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({ success: true })
    });

    const code = await runNotify(['--type', 'info', '--title', 't', '--message', 'm', '--source', 's']);

    expect(code).toBe(0);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toBe(`http://${apiInfoFixture.host}:${apiInfoFixture.port}/api/notifications`);
    expect((init as RequestInit).method).toBe('POST');
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({
      type: 'info',
      title: 't',
      message: 'm',
      source: 's'
    });
  });

  it('missing --type — returns 1 with stderr', async () => {
    const code = await runNotify(['--title', 't', '--message', 'm', '--source', 's']);
    expect(code).toBe(1);
    expect(collectOutput(stderrSpy)).toContain('missing required flag --type');
  });

  it('missing --title — returns 1 with stderr', async () => {
    const code = await runNotify(['--type', 'info', '--message', 'm', '--source', 's']);
    expect(code).toBe(1);
    expect(collectOutput(stderrSpy)).toContain('--title');
  });

  it('missing --message — returns 1 with stderr', async () => {
    const code = await runNotify(['--type', 'info', '--title', 't', '--source', 's']);
    expect(code).toBe(1);
    expect(collectOutput(stderrSpy)).toContain('--message');
  });

  it('missing --source — returns 1 with stderr', async () => {
    const code = await runNotify(['--type', 'info', '--title', 't', '--message', 'm']);
    expect(code).toBe(1);
    expect(collectOutput(stderrSpy)).toContain('--source');
  });

  it('invalid --type — returns 1 with allowed values', async () => {
    const code = await runNotify(['--type', 'banana', '--title', 't', '--message', 'm', '--source', 's']);
    expect(code).toBe(1);
    expect(collectOutput(stderrSpy)).toMatch(/error, warning, info/);
  });

  it('flags in arbitrary order — POSTs correct body and returns 0', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({ success: true })
    });

    const code = await runNotify(['--source', 's', '--type', 'warning', '--message', 'm', '--title', 't']);

    expect(code).toBe(0);
    const [, init] = mockFetch.mock.calls[0]!;
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({
      type: 'warning',
      title: 't',
      message: 'm',
      source: 's'
    });
  });

  it('discovery failure — returns 1 and stderr includes discovery message', async () => {
    mockDiscoverApiInfo.mockResolvedValueOnce(null);
    const code = await runNotify(['--type', 'info', '--title', 't', '--message', 'm', '--source', 's']);
    expect(code).toBe(1);
    expect(collectOutput(stderrSpy)).toContain('API discovery failed');
  });

  it('HTTP error response — returns 1 and stderr mentions "server responded with 500"', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'bad',
      json: async () => ({})
    });

    const code = await runNotify(['--type', 'info', '--title', 't', '--message', 'm', '--source', 's']);
    expect(code).toBe(1);
    expect(collectOutput(stderrSpy)).toContain('server responded with 500');
  });
});
