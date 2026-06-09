/**
 * Tests for the process-tree PID resolution utilities.
 *
 * @summary Tests for process-tree PID resolution
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({
  execSync: vi.fn()
}));

import { execSync } from 'node:child_process';
import { findAgentPid, PROCESS_TREE_MAX_DEPTH } from '../src/process-tree.js';

const mockExecSync = vi.mocked(execSync);

interface ProcEntry {
  comm: string;
  ppid: number | null;
  /** When true, the process-info query throws (process gone). */
  commFails?: boolean;
}

const IS_WINDOWS = process.platform === 'win32';

describe('process-tree', () => {
  beforeEach(() => {
    mockExecSync.mockReset();
  });

  /**
   * Mocks the single per-PID process-info query for the host platform.
   *
   * `findAgentPid` issues one subprocess per level: `ps -p <pid> -o comm=,ppid=`
   * on POSIX and a PowerShell `Win32_Process` query emitting `Name|ParentProcessId`
   * on Windows. This recognizes both shapes so the same logical tree drives the
   * test regardless of the host the suite runs on.
   *
   * @param tree - Logical process tree keyed by PID.
   */
  function setupProcessTree(tree: Record<number, ProcEntry>): void {
    mockExecSync.mockImplementation((cmd: string) => {
      const match = cmd.match(/ProcessId=(\d+)/) ?? cmd.match(/ps -p (\d+) /);
      if (!match) throw new Error(`Unexpected command: ${cmd}`);
      const pid = Number.parseInt(match[1]!, 10);
      const entry = tree[pid];
      if (!entry || entry.commFails || entry.ppid === null) {
        throw new Error(`process ${pid} not found`);
      }
      return IS_WINDOWS ? `${entry.comm}|${entry.ppid}\n` : `${entry.comm} ${entry.ppid}\n`;
    });
  }

  describe('findAgentPid', () => {
    it('skips bash/zsh/sh/dash/fish/ksh ancestors and returns the first non-shell PID', () => {
      setupProcessTree({
        100: { comm: 'bash', ppid: 200 },
        200: { comm: 'zsh', ppid: 300 },
        300: { comm: 'dash', ppid: 400 },
        400: { comm: 'sh', ppid: 500 },
        500: { comm: 'fish', ppid: 600 },
        600: { comm: 'ksh', ppid: 700 },
        700: { comm: 'claude', ppid: 1 }
      });

      expect(findAgentPid(100)).toBe(700);
    });

    it('returns the first non-shell ancestor even when it is "node" (SDK runner case)', () => {
      setupProcessTree({
        100: { comm: 'bash', ppid: 200 },
        200: { comm: 'node', ppid: 300 },
        300: { comm: 'claude', ppid: 1 }
      });

      expect(findAgentPid(100)).toBe(200);
    });

    it('returns null when only shells exist within the depth bound', () => {
      const tree: Record<number, ProcEntry> = {};
      for (let i = 100; i < 100 + PROCESS_TREE_MAX_DEPTH + 5; i++) {
        tree[i] = { comm: 'bash', ppid: i + 1 };
      }
      setupProcessTree(tree);

      expect(findAgentPid(100)).toBeNull();
    });

    it('returns null when traversal reaches PID 1', () => {
      setupProcessTree({
        2: { comm: 'bash', ppid: 1 }
      });

      expect(findAgentPid(2)).toBeNull();
    });

    it('returns null when starting at PID 1', () => {
      expect(findAgentPid(1)).toBeNull();
    });

    it('returns null and stops cleanly when ps fails for the start PID (PID gone)', () => {
      setupProcessTree({
        100: { comm: 'bash', ppid: 200, commFails: true }
      });

      expect(findAgentPid(100)).toBeNull();
    });

    it('stops at PROCESS_TREE_MAX_DEPTH and returns null', () => {
      const tree: Record<number, ProcEntry> = {};
      for (let i = 100; i < 100 + PROCESS_TREE_MAX_DEPTH + 5; i++) {
        tree[i] = { comm: 'bash', ppid: i + 1 };
      }
      const agentPid = 100 + PROCESS_TREE_MAX_DEPTH + 2;
      tree[agentPid] = { comm: 'claude', ppid: agentPid + 1 };
      tree[agentPid + 1] = { comm: 'init', ppid: 1 };
      setupProcessTree(tree);

      expect(findAgentPid(100)).toBeNull();
    });

    it('returns the start PID itself when it is non-shell', () => {
      setupProcessTree({
        100: { comm: 'claude', ppid: 1 }
      });

      expect(findAgentPid(100)).toBe(100);
    });
  });

  it('PROCESS_TREE_MAX_DEPTH is 10', () => {
    expect(PROCESS_TREE_MAX_DEPTH).toBe(10);
  });
});
