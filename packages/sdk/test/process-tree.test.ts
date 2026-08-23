/**
 * Tests for the process-tree PID resolution utilities.
 *
 * @summary Tests for process-tree PID resolution
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({
  execFile: vi.fn()
}));

import { execFile } from 'node:child_process';
import { findAgentPid, PROCESS_TREE_MAX_DEPTH } from '../src/process-tree.js';

const mockExecFile = vi.mocked(execFile);

interface ProcEntry {
  comm: string;
  ppid: number | null;
  /** When true, the process-info query fails (process gone). */
  commFails?: boolean;
}

const IS_WINDOWS = process.platform === 'win32';

describe('process-tree', () => {
  beforeEach(() => {
    mockExecFile.mockReset();
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

  it('PROCESS_TREE_MAX_DEPTH is 10', () => {
    expect(PROCESS_TREE_MAX_DEPTH).toBe(10);
  });
});
