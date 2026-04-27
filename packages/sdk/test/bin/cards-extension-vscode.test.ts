/**
 * Tests for the VS Code control subcommand handlers of `cards-extension`:
 * workspace, editor, execute-command, panel, and debug.
 *
 * Every test calls the exported handler function directly and asserts on the
 * returned exit code. `discoverApiInfo`, `fetch`, and `child_process.execFile`
 * are stubbed at module boundaries. All tests are skipped — Phase 3 will
 * implement the handlers and unskip them.
 *
 * @summary Skipped contract tests for VS Code CLI subcommands
 */

import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDiscoverApiInfo, mockExecFile } = vi.hoisted(() => ({
  mockDiscoverApiInfo: vi.fn(),
  mockExecFile: vi.fn()
}));

vi.mock('@cards/sdk/client/discovery', () => ({
  discoverApiInfo: mockDiscoverApiInfo
}));

vi.mock('node:child_process', () => ({
  execFile: mockExecFile
}));

import { runDebug } from '../../src/bin/cards-extension/debug.js';
import { runEditor } from '../../src/bin/cards-extension/editor.js';
import { runExecuteCommand } from '../../src/bin/cards-extension/execute-command.js';
import { runPanel } from '../../src/bin/cards-extension/panel.js';
import { runWorkspace } from '../../src/bin/cards-extension/workspace.js';

const API_INFO = {
  host: '127.0.0.1',
  port: 12345,
  accessToken: 'test-secret'
};

const WORKSPACE_PATH = '/workspace/test-project';

type ConsoleSpy = ReturnType<typeof vi.spyOn>;

function collectOutput(spy: ConsoleSpy): string {
  return spy.mock.calls.map((c: unknown[]) => c.map(String).join(' ')).join('\n');
}

function mockStdin(payload: string): () => void {
  const original = process.stdin;
  const stream = Readable.from([Buffer.from(payload, 'utf-8')]);
  Object.defineProperty(process, 'stdin', { value: stream, configurable: true });
  return () => {
    Object.defineProperty(process, 'stdin', { value: original, configurable: true });
  };
}

/**
 * Returns a Response-like object that fetch resolves to.
 *
 * @param status - HTTP status code.
 * @param body - JSON body to return.
 * @returns Minimal fetch Response stub.
 */
function makeResponse(status: number, body: unknown): object {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body)
  };
}

describe('runWorkspace handler', () => {
  let stderrSpy: ConsoleSpy;
  let stdoutSpy: ConsoleSpy;
  const mockFetch = vi.fn();

  beforeEach(() => {
    stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    stdoutSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockDiscoverApiInfo.mockReset();
    mockDiscoverApiInfo.mockResolvedValue(API_INFO);
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    stdoutSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('workspace list — GETs /workspaces and prints JSON array to stdout', async () => {
    const workspaces = [{ path: WORKSPACE_PATH, name: 'test-project' }];
    mockFetch.mockResolvedValueOnce(makeResponse(200, { workspaces }));

    const code = await runWorkspace(['list']);

    expect(code).toBe(0);
    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toBe(`http://${API_INFO.host}:${API_INFO.port}/workspaces`);
    expect((init as RequestInit).method).toBe('GET');
    expect((init as RequestInit & { headers: Record<string, string> }).headers?.['Authorization']).toBe(
      `Bearer ${API_INFO.accessToken}`
    );
    const stdout = collectOutput(stdoutSpy);
    expect(JSON.parse(stdout)).toEqual(workspaces);
  });

  it('workspace list — discovery failure returns 1 with message', async () => {
    mockDiscoverApiInfo.mockResolvedValueOnce(null);

    const code = await runWorkspace(['list']);

    expect(code).toBe(1);
    expect(collectOutput(stderrSpy)).toContain('API discovery failed');
  });

  it('workspace list — 404 response prints unregistered workspace message and returns 1', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(404, { error: 'not found' }));

    const code = await runWorkspace(['list']);

    expect(code).toBe(1);
    expect(collectOutput(stderrSpy)).toContain('workspace not registered');
  });
});

describe('runEditor handler', () => {
  let stderrSpy: ConsoleSpy;
  let stdoutSpy: ConsoleSpy;
  const mockFetch = vi.fn();

  beforeEach(() => {
    stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    stdoutSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockDiscoverApiInfo.mockReset();
    mockDiscoverApiInfo.mockResolvedValue(API_INFO);
    mockExecFile.mockReset();
    mockExecFile.mockImplementation(
      (_cmd: string, _args: string[], callback: (err: null, result: { stdout: string }) => void) => {
        callback(null, { stdout: `${WORKSPACE_PATH}\n` });
      }
    );
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    stdoutSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('editor info — GETs /editor with workspacePath from git and prints EditorInfo JSON', async () => {
    const editorInfo = { filePath: '/workspace/test-project/src/index.ts', line: 10, column: 5 };
    mockFetch.mockResolvedValueOnce(makeResponse(200, editorInfo));

    const code = await runEditor(['info']);

    expect(code).toBe(0);
    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toContain('/editor');
    expect(url).toContain(`workspacePath=${encodeURIComponent(WORKSPACE_PATH)}`);
    expect((init as RequestInit).method).toBe('GET');
    expect((init as RequestInit & { headers: Record<string, string> }).headers?.['Authorization']).toBe(
      `Bearer ${API_INFO.accessToken}`
    );
    const stdout = collectOutput(stdoutSpy);
    expect(JSON.parse(stdout)).toEqual(editorInfo);
  });

  it('editor info — uses --workspace flag when provided instead of git', async () => {
    const editorInfo = { filePath: '/other/src/main.ts', line: 1, column: 0 };
    mockFetch.mockResolvedValueOnce(makeResponse(200, editorInfo));

    const code = await runEditor(['info', '--workspace', '/other/project']);

    expect(code).toBe(0);
    const [url] = mockFetch.mock.calls[0]!;
    expect(url).toContain(`workspacePath=${encodeURIComponent('/other/project')}`);
    // git should NOT be called when --workspace is provided
    expect(mockExecFile).not.toHaveBeenCalled();
  });

  it('editor info — git failure without --workspace returns 1 with clear error', async () => {
    mockExecFile.mockImplementation((_cmd: string, _args: string[], callback: (err: Error) => void) => {
      callback(new Error('not a git repository'));
    });

    const code = await runEditor(['info']);

    expect(code).toBe(1);
    const stderr = collectOutput(stderrSpy);
    expect(stderr).toContain('--workspace');
  });

  it('editor open — POSTs /editor/open with filePath, line, character', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(204, null));

    const code = await runEditor(['open', '/workspace/test-project/src/index.ts', '--line', '5', '--character', '3']);

    expect(code).toBe(0);
    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toContain('/editor/open');
    expect((init as RequestInit).method).toBe('POST');
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.filePath).toBe('/workspace/test-project/src/index.ts');
    expect(body.line).toBe(5);
    expect(body.character).toBe(3);
  });

  it('editor open — --preview and --focus=false populate the request body', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(204, null));

    const code = await runEditor(['open', '/workspace/test-project/src/index.ts', '--preview', '--focus=false']);

    expect(code).toBe(0);
    const [, init] = mockFetch.mock.calls[0]!;
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.preview).toBe(true);
    expect(body.focus).toBe(false);
  });

  it('editor open — --line without a value returns 1 with a clear error', async () => {
    const code = await runEditor(['open', '/workspace/test-project/src/index.ts', '--line', '--character', '3']);

    expect(code).toBe(1);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(collectOutput(stderrSpy)).toMatch(/--line.*requires a value/);
  });

  it('editor open — 422 response (file not found) returns 1 with clear error', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(422, { error: 'FileNotFound: /missing/file.ts' }));

    const code = await runEditor(['open', '/missing/file.ts']);

    expect(code).toBe(1);
    expect(collectOutput(stderrSpy)).toMatch(/file not found|FileNotFound/i);
  });

  it('editor select — POSTs /editor/select with L:C parsed start and end', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(204, null));

    const code = await runEditor(['select', '/workspace/test-project/src/index.ts', '--start', '1:0', '--end', '3:10']);

    expect(code).toBe(0);
    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toContain('/editor/select');
    expect((init as RequestInit).method).toBe('POST');
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.filePath).toBe('/workspace/test-project/src/index.ts');
    expect(body.startLine).toBe(1);
    expect(body.startColumn).toBe(0);
    expect(body.endLine).toBe(3);
    expect(body.endColumn).toBe(10);
  });

  it('editor — 404 from server returns 1 with workspace-not-registered message', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(404, { error: 'workspace not registered' }));

    const code = await runEditor(['info']);

    expect(code).toBe(1);
    expect(collectOutput(stderrSpy)).toContain('workspace not registered');
  });
});

describe('runExecuteCommand handler', () => {
  let stderrSpy: ConsoleSpy;
  let stdoutSpy: ConsoleSpy;
  const mockFetch = vi.fn();

  beforeEach(() => {
    stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    stdoutSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockDiscoverApiInfo.mockReset();
    mockDiscoverApiInfo.mockResolvedValue(API_INFO);
    mockExecFile.mockReset();
    mockExecFile.mockImplementation(
      (_cmd: string, _args: string[], callback: (err: null, result: { stdout: string }) => void) => {
        callback(null, { stdout: `${WORKSPACE_PATH}\n` });
      }
    );
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    stdoutSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('reads JSON args from stdin, POSTs to /execute-command, prints bare result', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, { result: 'done' }));
    const restore = mockStdin(JSON.stringify(['arg1', 'arg2']));

    const code = await runExecuteCommand(['workbench.action.findInFiles']);
    restore();

    expect(code).toBe(0);
    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toContain('/execute-command');
    expect((init as RequestInit).method).toBe('POST');
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.command).toBe('workbench.action.findInFiles');
    expect(body.args).toEqual(['arg1', 'arg2']);
    const stdout = collectOutput(stdoutSpy);
    // stdout receives the bare result, not the {result, lossyCoercion} envelope.
    expect(JSON.parse(stdout)).toBe('done');
  });

  it('TTY stdin is treated as no args and does not block', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, { result: null }));
    const original = process.stdin;
    Object.defineProperty(process, 'stdin', {
      value: { isTTY: true },
      configurable: true
    });
    try {
      const code = await runExecuteCommand(['editor.action.formatDocument']);
      expect(code).toBe(0);
      const [, init] = mockFetch.mock.calls[0]!;
      const body = JSON.parse(String((init as RequestInit).body));
      expect(body.args).toEqual([]);
    } finally {
      Object.defineProperty(process, 'stdin', { value: original, configurable: true });
    }
  });

  it('empty stdin sends args: [] to endpoint', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, { result: null }));
    const restore = mockStdin('');

    const code = await runExecuteCommand(['editor.action.formatDocument']);
    restore();

    expect(code).toBe(0);
    const [, init] = mockFetch.mock.calls[0]!;
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.args).toEqual([]);
  });

  it('malformed JSON on stdin returns 1 with parse error message', async () => {
    const restore = mockStdin('not-valid-json{');

    const code = await runExecuteCommand(['some.command']);
    restore();

    expect(code).toBe(1);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(collectOutput(stderrSpy)).toMatch(/parse|JSON|invalid/i);
  });

  it('non-array stdin returns 1 with type error message', async () => {
    const restore = mockStdin(JSON.stringify({ key: 'value' }));

    const code = await runExecuteCommand(['some.command']);
    restore();

    expect(code).toBe(1);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(collectOutput(stderrSpy)).toMatch(/array/i);
  });

  it('lossyCoercion in response prints warning to stderr and bare result to stdout', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, { result: 'approximation', lossyCoercion: true }));
    const restore = mockStdin('[]');

    const code = await runExecuteCommand(['some.command']);
    restore();

    expect(code).toBe(0);
    const stderr = collectOutput(stderrSpy);
    expect(stderr).toMatch(/lossyCoercion|serialization|warning/i);
    const stdout = collectOutput(stdoutSpy);
    expect(JSON.parse(stdout)).toBe('approximation');
  });

  it('--save flag is passed in request body as saveAll: true', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, { result: null }));
    const restore = mockStdin('[]');

    const code = await runExecuteCommand(['editor.action.formatDocument', '--save']);
    restore();

    expect(code).toBe(0);
    const [, init] = mockFetch.mock.calls[0]!;
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.saveAll).toBe(true);
  });

  it('404 from server returns 1 with workspace-not-registered message', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(404, { error: 'workspace not registered' }));
    const restore = mockStdin('[]');

    const code = await runExecuteCommand(['some.command']);
    restore();

    expect(code).toBe(1);
    expect(collectOutput(stderrSpy)).toContain('workspace not registered');
  });
});

describe('runPanel handler', () => {
  let stderrSpy: ConsoleSpy;
  let stdoutSpy: ConsoleSpy;
  const mockFetch = vi.fn();

  beforeEach(() => {
    stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    stdoutSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockDiscoverApiInfo.mockReset();
    mockDiscoverApiInfo.mockResolvedValue(API_INFO);
    mockExecFile.mockReset();
    mockExecFile.mockImplementation(
      (_cmd: string, _args: string[], callback: (err: null, result: { stdout: string }) => void) => {
        callback(null, { stdout: `${WORKSPACE_PATH}\n` });
      }
    );
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    stdoutSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('panel show problems — POSTs /panel/show with panel: "problems"', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(204, null));

    const code = await runPanel(['show', 'problems']);

    expect(code).toBe(0);
    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toContain('/panel/show');
    expect((init as RequestInit).method).toBe('POST');
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.panel).toBe('problems');
  });

  it('panel show terminal — POSTs /panel/show with panel: "terminal"', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(204, null));

    const code = await runPanel(['show', 'terminal']);

    expect(code).toBe(0);
    const [, init] = mockFetch.mock.calls[0]!;
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.panel).toBe('terminal');
  });

  it('panel show debug — POSTs /panel/show with panel: "debug"', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(204, null));

    const code = await runPanel(['show', 'debug']);

    expect(code).toBe(0);
  });

  it('panel show output — POSTs /panel/show with panel: "output"', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(204, null));

    const code = await runPanel(['show', 'output']);

    expect(code).toBe(0);
  });

  it('panel show unknown — returns 1 without making any HTTP call', async () => {
    const code = await runPanel(['show', 'unknown-panel']);

    expect(code).toBe(1);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(collectOutput(stderrSpy)).toMatch(/unknown|invalid|panel/i);
  });

  it('panel — 404 from server returns 1 with workspace-not-registered message', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(404, { error: 'workspace not registered' }));

    const code = await runPanel(['show', 'problems']);

    expect(code).toBe(1);
    expect(collectOutput(stderrSpy)).toContain('workspace not registered');
  });
});

describe('runDebug handler', () => {
  let stderrSpy: ConsoleSpy;
  let stdoutSpy: ConsoleSpy;
  const mockFetch = vi.fn();

  beforeEach(() => {
    stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    stdoutSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockDiscoverApiInfo.mockReset();
    mockDiscoverApiInfo.mockResolvedValue(API_INFO);
    mockExecFile.mockReset();
    mockExecFile.mockImplementation(
      (_cmd: string, _args: string[], callback: (err: null, result: { stdout: string }) => void) => {
        callback(null, { stdout: `${WORKSPACE_PATH}\n` });
      }
    );
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    stdoutSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('debug start — POSTs /debug/start with empty body and returns 0', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(204, null));

    const code = await runDebug(['start']);

    expect(code).toBe(0);
    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toContain('/debug/start');
    expect((init as RequestInit).method).toBe('POST');
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.configName).toBeUndefined();
  });

  it('debug start --config "My Config" — passes configName in body', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(204, null));

    const code = await runDebug(['start', '--config', 'My Config']);

    expect(code).toBe(0);
    const [, init] = mockFetch.mock.calls[0]!;
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.configName).toBe('My Config');
  });

  it('debug stop — POSTs /debug/stop and prints { stopped } result', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, { stopped: true }));

    const code = await runDebug(['stop']);

    expect(code).toBe(0);
    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toContain('/debug/stop');
    expect((init as RequestInit).method).toBe('POST');
    const stdout = collectOutput(stdoutSpy);
    expect(JSON.parse(stdout)).toEqual({ stopped: true });
  });

  it('debug stop — stopped: false is printed when no session was running', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, { stopped: false }));

    const code = await runDebug(['stop']);

    expect(code).toBe(0);
    const stdout = collectOutput(stdoutSpy);
    expect(JSON.parse(stdout)).toEqual({ stopped: false });
  });

  it('debug state — GETs /debug/state and prints DebugState JSON', async () => {
    const debugState = { active: true, sessionName: 'Launch App' };
    mockFetch.mockResolvedValueOnce(makeResponse(200, debugState));

    const code = await runDebug(['state']);

    expect(code).toBe(0);
    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toContain('/debug/state');
    expect((init as RequestInit).method).toBe('GET');
    const stdout = collectOutput(stdoutSpy);
    expect(JSON.parse(stdout)).toEqual(debugState);
  });

  it('debug state with --workspace flag — uses provided workspace path in URL', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, { active: false }));

    const code = await runDebug(['state', '--workspace', '/custom/workspace']);

    expect(code).toBe(0);
    const [url] = mockFetch.mock.calls[0]!;
    expect(url).toContain(`workspacePath=${encodeURIComponent('/custom/workspace')}`);
    expect(mockExecFile).not.toHaveBeenCalled();
  });

  it('debug — git failure without --workspace returns 1 with clear error', async () => {
    mockExecFile.mockImplementation((_cmd: string, _args: string[], callback: (err: Error) => void) => {
      callback(new Error('not a git repo'));
    });

    const code = await runDebug(['state']);

    expect(code).toBe(1);
    expect(collectOutput(stderrSpy)).toContain('--workspace');
  });

  it('debug — 404 from server returns 1 with workspace-not-registered message', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(404, { error: 'workspace not registered' }));

    const code = await runDebug(['start']);

    expect(code).toBe(1);
    expect(collectOutput(stderrSpy)).toContain('workspace not registered');
  });
});
