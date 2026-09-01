/**
 * Tests for the process-tree PID resolution utilities.
 *
 * @summary Tests for process-tree PID resolution
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({
  execFile: vi.fn()
}));
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  readlink: vi.fn()
}));

import { execFile } from 'node:child_process';
import { readFile, readlink } from 'node:fs/promises';
import { findAgentPid, isAgentProcessTreeDrained, PROCESS_TREE_MAX_DEPTH } from '../src/process-tree.js';

const mockExecFile = vi.mocked(execFile);
const mockReadFile = vi.mocked(readFile);
const mockReadlink = vi.mocked(readlink);

interface ProcEntry {
  comm: string;
  ppid: number | null;
  /** When true, the process-info query fails (process gone). */
  commFails?: boolean;
}

interface ProcessSnapshotEntry {
  executable: string | null;
  pid: number;
  ppid: number;
  processGroupId: number;
  revalidatedStartIdentity?: number;
  sessionId: number;
  startIdentity: number;
}

const IS_WINDOWS = process.platform === 'win32';

describe('process-tree', () => {
  beforeEach(() => {
    mockExecFile.mockReset();
    mockReadFile.mockReset();
    mockReadlink.mockReset();
  });

  /**
   * Mocks the single per-PID process-info subprocess for the host platform.
   *
   * `findAgentPid` issues one async `execFile` per level: `ps -p <pid> -o comm=,ppid=`
   * on POSIX and a PowerShell `Win32_Process` query emitting `Name|ParentProcessId`
   * on Windows. This recognizes both shapes so the same logical tree drives the
   * test regardless of the host the suite runs on.
   *
   * @param tree - Logical process tree keyed by PID.
   */
  function setupProcessTree(tree: Record<number, ProcEntry>): void {
    mockExecFile.mockImplementation((...callArgs: unknown[]) => {
      const argv = callArgs[1] as string[];
      const cb = callArgs[callArgs.length - 1] as (
        err: Error | null,
        result: { stdout: string; stderr: string }
      ) => void;
      const pid = extractPid(argv);
      const entry = pid === null ? undefined : tree[pid];
      if (pid === null || !entry || entry.commFails || entry.ppid === null) {
        cb(new Error(`process ${pid ?? '?'} not found`), { stdout: '', stderr: '' });
        return {} as ReturnType<typeof execFile>;
      }
      cb(null, {
        stdout: IS_WINDOWS ? `${entry.comm}|${entry.ppid}\n` : `${entry.comm} ${entry.ppid}\n`,
        stderr: ''
      });
      return {} as ReturnType<typeof execFile>;
    });
  }

  function extractPid(argv: string[]): number | null {
    if (IS_WINDOWS) {
      const script = argv[argv.length - 1] ?? '';
      const match = script.match(/ProcessId=(\d+)/);
      return match ? Number.parseInt(match[1]!, 10) : null;
    }
    return Number.parseInt(argv[1] ?? '', 10);
  }

  function setupProcessSnapshot(entries: ProcessSnapshotEntry[], finalEntries = entries): void {
    const statReads = new Map<number, number>();
    let topologyReads = 0;
    mockExecFile.mockImplementation((...callArgs: unknown[]) => {
      const cb = callArgs[callArgs.length - 1] as (
        err: Error | null,
        result: { stdout: string; stderr: string }
      ) => void;
      topologyReads += 1;
      const snapshotEntries = topologyReads >= 3 ? finalEntries : entries;
      const stdout = snapshotEntries
        .map((entry) =>
          IS_WINDOWS
            ? [
                entry.pid,
                entry.ppid,
                entry.processGroupId,
                entry.sessionId,
                entry.startIdentity,
                entry.executable
              ].join('|')
            : `${entry.pid} ${entry.ppid} ${entry.processGroupId} ${entry.sessionId} ${entry.startIdentity} ${entry.executable}`
        )
        .join('\n');
      cb(null, { stdout: `${stdout}\n`, stderr: '' });
      return {} as ReturnType<typeof execFile>;
    });
    mockReadFile.mockImplementation(async (path) => {
      const pid = Number.parseInt(path.toString().match(/\/proc\/(\d+)\/stat/)?.[1] ?? '', 10);
      const entry = entries.find((candidate) => candidate.pid === pid);
      if (!entry) throw new Error(`process ${pid} not found`);
      const readCount = (statReads.get(pid) ?? 0) + 1;
      statReads.set(pid, readCount);
      const startIdentity =
        readCount > 1 ? (entry.revalidatedStartIdentity ?? entry.startIdentity) : entry.startIdentity;
      const statFields = [entry.ppid, entry.processGroupId, entry.sessionId, ...Array(15).fill(0), startIdentity, 0];
      return `${entry.pid} (process) S ${statFields.join(' ')}\n`;
    });
    mockReadlink.mockImplementation(async (path) => {
      const pid = Number.parseInt(path.toString().match(/\/proc\/(\d+)\/exe/)?.[1] ?? '', 10);
      const entry = entries.find((candidate) => candidate.pid === pid);
      if (!entry?.executable) throw new Error(`executable for ${pid} unavailable`);
      return entry.executable;
    });
  }

  describe('findAgentPid', () => {
    it('skips bash/zsh/sh/dash/fish/ksh ancestors and returns the first non-shell PID', async () => {
      setupProcessTree({
        100: { comm: 'bash', ppid: 200 },
        200: { comm: 'zsh', ppid: 300 },
        300: { comm: 'dash', ppid: 400 },
        400: { comm: 'sh', ppid: 500 },
        500: { comm: 'fish', ppid: 600 },
        600: { comm: 'ksh', ppid: 700 },
        700: { comm: 'claude', ppid: 1 }
      });

      await expect(findAgentPid(100)).resolves.toBe(700);
    });

    it('returns the first non-shell ancestor even when it is "node" (SDK runner case)', async () => {
      setupProcessTree({
        100: { comm: 'bash', ppid: 200 },
        200: { comm: 'node', ppid: 300 },
        300: { comm: 'claude', ppid: 1 }
      });

      await expect(findAgentPid(100)).resolves.toBe(200);
    });

    it('returns null when only shells exist within the depth bound', async () => {
      const tree: Record<number, ProcEntry> = {};
      for (let i = 100; i < 100 + PROCESS_TREE_MAX_DEPTH + 5; i++) {
        tree[i] = { comm: 'bash', ppid: i + 1 };
      }
      setupProcessTree(tree);

      await expect(findAgentPid(100)).resolves.toBeNull();
    });

    it('returns null when traversal reaches PID 1', async () => {
      setupProcessTree({
        2: { comm: 'bash', ppid: 1 }
      });

      await expect(findAgentPid(2)).resolves.toBeNull();
    });

    it('returns null when starting at PID 1', async () => {
      await expect(findAgentPid(1)).resolves.toBeNull();
    });

    it('returns null and stops cleanly when ps fails for the start PID (PID gone)', async () => {
      setupProcessTree({
        100: { comm: 'bash', ppid: 200, commFails: true }
      });

      await expect(findAgentPid(100)).resolves.toBeNull();
    });

    it('stops at PROCESS_TREE_MAX_DEPTH and returns null', async () => {
      const tree: Record<number, ProcEntry> = {};
      for (let i = 100; i < 100 + PROCESS_TREE_MAX_DEPTH + 5; i++) {
        tree[i] = { comm: 'bash', ppid: i + 1 };
      }
      const agentPid = 100 + PROCESS_TREE_MAX_DEPTH + 2;
      tree[agentPid] = { comm: 'claude', ppid: agentPid + 1 };
      tree[agentPid + 1] = { comm: 'init', ppid: 1 };
      setupProcessTree(tree);

      await expect(findAgentPid(100)).resolves.toBeNull();
    });

    it('returns the start PID itself when it is non-shell', async () => {
      setupProcessTree({
        100: { comm: 'claude', ppid: 1 }
      });

      await expect(findAgentPid(100)).resolves.toBe(100);
    });
  });

  describe('isAgentProcessTreeDrained', () => {
    const agent: ProcessSnapshotEntry = {
      executable: '/opt/codex/codex',
      pid: 100,
      ppid: 1,
      processGroupId: 90,
      sessionId: 90,
      startIdentity: 1_000
    };
    const hookRunner: ProcessSnapshotEntry = {
      executable: '/usr/bin/node',
      pid: 300,
      ppid: agent.pid,
      processGroupId: 300,
      sessionId: 300,
      startIdentity: 1_200
    };
    const hook: ProcessSnapshotEntry = {
      executable: '/usr/bin/node',
      pid: 301,
      ppid: hookRunner.pid,
      processGroupId: hookRunner.processGroupId,
      sessionId: hookRunner.sessionId,
      startIdentity: 1_201
    };

    it('reports drained when only the Stop-hook branch remains', async () => {
      setupProcessSnapshot([agent, hookRunner, hook]);

      await expect(isAgentProcessTreeDrained(agent.pid, hook.pid)).resolves.toBe(true);
    });

    it('reports drained when the only sibling is a verified persistent Codex helper', async () => {
      setupProcessSnapshot([
        agent,
        {
          executable: '/opt/codex/codex-code-mode-host',
          pid: 200,
          ppid: agent.pid,
          processGroupId: 200,
          sessionId: agent.sessionId,
          startIdentity: 1_100
        },
        hookRunner,
        hook
      ]);

      await expect(isAgentProcessTreeDrained(agent.pid, hook.pid)).resolves.toBe(true);
    });

    it('reports busy when genuine background work remains', async () => {
      setupProcessSnapshot([
        agent,
        {
          executable: '/usr/bin/node',
          pid: 400,
          ppid: agent.pid,
          processGroupId: 400,
          sessionId: 400,
          startIdentity: 1_150
        },
        hookRunner,
        hook
      ]);

      await expect(isAgentProcessTreeDrained(agent.pid, hook.pid)).resolves.toBe(false);
    });

    it('fails closed for a helper-named descendant without verified lifecycle and executable identity', async () => {
      setupProcessSnapshot([
        agent,
        {
          executable: '/tmp/codex-code-mode-host',
          pid: 500,
          ppid: agent.pid,
          processGroupId: 500,
          sessionId: 500,
          startIdentity: 900
        },
        hookRunner,
        hook
      ]);

      const result = await isAgentProcessTreeDrained(agent.pid, hook.pid);
      expect([false, null]).toContain(result);
    });

    it('returns null when executable provenance cannot be inspected', async () => {
      setupProcessSnapshot([
        agent,
        {
          executable: null,
          pid: 500,
          ppid: agent.pid,
          processGroupId: 500,
          sessionId: agent.sessionId,
          startIdentity: 1_100
        },
        hookRunner,
        hook
      ]);

      await expect(isAgentProcessTreeDrained(agent.pid, hook.pid)).resolves.toBeNull();
    });

    it('returns null when a candidate start identity changes during inspection', async () => {
      setupProcessSnapshot([
        agent,
        {
          executable: '/opt/codex/codex-code-mode-host',
          pid: 200,
          ppid: agent.pid,
          processGroupId: 200,
          revalidatedStartIdentity: 1_101,
          sessionId: agent.sessionId,
          startIdentity: 1_100
        },
        hookRunner,
        hook
      ]);

      await expect(isAgentProcessTreeDrained(agent.pid, hook.pid)).resolves.toBeNull();
    });

    it('returns null when a new descendant appears during identity enrichment', async () => {
      const helper: ProcessSnapshotEntry = {
        executable: '/opt/codex/codex-code-mode-host',
        pid: 200,
        ppid: agent.pid,
        processGroupId: 200,
        sessionId: agent.sessionId,
        startIdentity: 1_100
      };
      const initialEntries = [agent, helper, hookRunner, hook];
      setupProcessSnapshot(initialEntries, [
        ...initialEntries,
        {
          executable: '/usr/bin/node',
          pid: 600,
          ppid: agent.pid,
          processGroupId: 600,
          sessionId: 600,
          startIdentity: 1_300
        }
      ]);

      await expect(isAgentProcessTreeDrained(agent.pid, hook.pid)).resolves.toBeNull();
    });

    it('does not ignore descendants owned by a verified helper', async () => {
      setupProcessSnapshot([
        agent,
        {
          executable: '/opt/codex/codex-code-mode-host',
          pid: 200,
          ppid: agent.pid,
          processGroupId: 200,
          sessionId: agent.sessionId,
          startIdentity: 1_100
        },
        {
          executable: '/usr/bin/node',
          pid: 201,
          ppid: 200,
          processGroupId: 201,
          sessionId: agent.sessionId,
          startIdentity: 1_101
        },
        hookRunner,
        hook
      ]);

      await expect(isAgentProcessTreeDrained(agent.pid, hook.pid)).resolves.toBe(false);
    });
  });

  it('uses Darwin lifecycle and text-vnode provenance and fails closed when provenance is unavailable', async () => {
    const platformDescriptor = Object.getOwnPropertyDescriptor(process, 'platform');
    Object.defineProperty(process, 'platform', { configurable: true, value: 'darwin' });
    vi.resetModules();
    try {
      const { execFile: darwinExecFile } = await import('node:child_process');
      const darwinMockExecFile = vi.mocked(darwinExecFile);
      const entries = [
        {
          executable: '/opt/codex/codex',
          pgid: 90,
          pid: 100,
          ppid: 1,
          sessionId: 90,
          startedAt: 'Sep 1 12:00:00 2026'
        },
        {
          executable: '/opt/codex/codex-code-mode-host',
          pgid: 200,
          pid: 200,
          ppid: 100,
          sessionId: 90,
          startedAt: 'Sep 1 12:00:01 2026'
        },
        {
          executable: '/usr/bin/node',
          pgid: 300,
          pid: 300,
          ppid: 100,
          sessionId: 300,
          startedAt: 'Sep 1 12:00:02 2026'
        },
        {
          executable: '/usr/bin/node',
          pgid: 300,
          pid: 301,
          ppid: 300,
          sessionId: 300,
          startedAt: 'Sep 1 12:00:03 2026'
        }
      ];
      let denyTextVnode = false;
      darwinMockExecFile.mockImplementation((...callArgs: unknown[]) => {
        const file = callArgs[0] as string;
        const argv = callArgs[1] as string[];
        const cb = callArgs[callArgs.length - 1] as (
          err: Error | null,
          result: { stdout: string; stderr: string }
        ) => void;
        if (file === 'ps' && argv[0] === '-e') {
          cb(null, { stdout: `${entries.map((entry) => `${entry.pid} ${entry.ppid}`).join('\n')}\n`, stderr: '' });
        } else {
          const pid = Number.parseInt(file === 'ps' ? (argv[1] ?? '') : (argv[2] ?? ''), 10);
          const entry = entries.find((candidate) => candidate.pid === pid);
          if (!entry || (file === '/usr/sbin/lsof' && denyTextVnode)) {
            cb(new Error(`process ${pid} unavailable`), { stdout: '', stderr: '' });
          } else if (file === 'ps') {
            cb(null, {
              stdout: `${entry.pid} ${entry.ppid} ${entry.pgid} ${entry.sessionId} ${entry.startedAt}\n`,
              stderr: ''
            });
          } else {
            cb(null, { stdout: `p${entry.pid}\nn${entry.executable}\n`, stderr: '' });
          }
        }
        return {} as ReturnType<typeof execFile>;
      });
      const { isAgentProcessTreeDrained: darwinIsAgentProcessTreeDrained } = await import('../src/process-tree.js');

      await expect(darwinIsAgentProcessTreeDrained(100, 301)).resolves.toBe(true);
      denyTextVnode = true;
      await expect(darwinIsAgentProcessTreeDrained(100, 301)).resolves.toBeNull();
    } finally {
      if (platformDescriptor) Object.defineProperty(process, 'platform', platformDescriptor);
      vi.resetModules();
    }
  });

  it('PROCESS_TREE_MAX_DEPTH is 10', () => {
    expect(PROCESS_TREE_MAX_DEPTH).toBe(10);
  });
});
