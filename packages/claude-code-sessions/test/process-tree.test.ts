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
  /** When true, `ps -p <pid> -o comm=` throws (process gone). */
  commFails?: boolean;
}

describe('process-tree', () => {
  beforeEach(() => {
    mockExecSync.mockReset();
  });

  function setupProcessTree(tree: Record<number, ProcEntry>): void {
    mockExecSync.mockImplementation((cmd: string) => {
      const commMatch = cmd.match(/ps -p (\d+) -o comm=/);
      if (commMatch) {
        const pid = Number.parseInt(commMatch[1]!, 10);
        const entry = tree[pid];
        if (!entry || entry.commFails) throw new Error(`ps: pid ${pid} not found`);
        return `${entry.comm}\n`;
      }

      const ppidMatch = cmd.match(/ps -p (\d+) -o ppid=/);
      if (ppidMatch) {
        const pid = Number.parseInt(ppidMatch[1]!, 10);
        const entry = tree[pid];
        if (!entry || entry.ppid === null) throw new Error(`ps: pid ${pid} not found`);
        return `${entry.ppid}\n`;
      }

      throw new Error(`Unexpected command: ${cmd}`);
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
