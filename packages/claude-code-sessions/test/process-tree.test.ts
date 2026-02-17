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
import { findAllClaudePids, findClaudePid, PROCESS_TREE_MAX_DEPTH } from '../src/process-tree.js';

const mockExecSync = vi.mocked(execSync);

describe('process-tree', () => {
  beforeEach(() => {
    mockExecSync.mockReset();
  });

  /**
   * Helper to configure mockExecSync responses for a chain of processes.
   * Each entry maps a PID to { comm, args, ppid }.
   *
   * @param tree - Process tree entries keyed by PID.
   */
  function setupProcessTree(tree: Record<number, { comm: string; args?: string; ppid: number | null }>): void {
    mockExecSync.mockImplementation((cmd: string) => {
      const commMatch = cmd.match(/ps -p (\d+) -o comm=/);
      if (commMatch) {
        const pid = Number.parseInt(commMatch[1], 10);
        const entry = tree[pid];
        if (!entry) throw new Error(`ps: pid ${pid} not found`);
        return `${entry.comm}\n`;
      }

      const argsMatch = cmd.match(/ps -p (\d+) -o args=/);
      if (argsMatch) {
        const pid = Number.parseInt(argsMatch[1], 10);
        const entry = tree[pid];
        if (!entry) throw new Error(`ps: pid ${pid} not found`);
        return `${entry.args ?? entry.comm}\n`;
      }

      const ppidMatch = cmd.match(/ps -p (\d+) -o ppid=/);
      if (ppidMatch) {
        const pid = Number.parseInt(ppidMatch[1], 10);
        const entry = tree[pid];
        if (!entry || entry.ppid === null) throw new Error(`ps: pid ${pid} not found`);
        return `${entry.ppid}\n`;
      }

      throw new Error(`Unexpected command: ${cmd}`);
    });
  }

  describe('findClaudePid', () => {
    it('returns nearest Claude ancestor PID', () => {
      setupProcessTree({
        100: { comm: 'bash', ppid: 200 },
        200: { comm: 'claude', ppid: 300 },
        300: { comm: 'zsh', ppid: 1 }
      });

      const result = findClaudePid(100);
      expect(result).toBe(200);
    });

    it('returns null when no Claude in ancestry', () => {
      setupProcessTree({
        100: { comm: 'bash', ppid: 200 },
        200: { comm: 'zsh', ppid: 1 }
      });

      const result = findClaudePid(100);
      expect(result).toBeNull();
    });
  });

  describe('findAllClaudePids', () => {
    it('returns all Claude ancestors nearest-first', () => {
      setupProcessTree({
        100: { comm: 'bash', ppid: 200 },
        200: { comm: 'claude', ppid: 300 },
        300: { comm: 'node', ppid: 400 },
        400: { comm: 'claude', ppid: 1 }
      });

      const result = findAllClaudePids(100);
      expect(result).toEqual([200, 400]);
    });
  });

  describe('traversal stops at PID <= 1', () => {
    it('stops when reaching PID 1', () => {
      setupProcessTree({
        2: { comm: 'bash', ppid: 1 }
      });

      const result = findClaudePid(2);
      expect(result).toBeNull();
    });

    it('stops when starting at PID 1', () => {
      const result = findClaudePid(1);
      expect(result).toBeNull();
    });
  });

  describe('traversal stops at PROCESS_TREE_MAX_DEPTH', () => {
    it('stops after max depth iterations', () => {
      // Build a chain longer than PROCESS_TREE_MAX_DEPTH
      const tree: Record<number, { comm: string; ppid: number | null }> = {};
      for (let i = 100; i < 100 + PROCESS_TREE_MAX_DEPTH + 5; i++) {
        tree[i] = { comm: 'bash', ppid: i + 1 };
      }
      // Put claude beyond max depth
      const claudePid = 100 + PROCESS_TREE_MAX_DEPTH + 2;
      tree[claudePid] = { comm: 'claude', ppid: claudePid + 1 };
      tree[claudePid + 1] = { comm: 'init', ppid: 1 };

      setupProcessTree(tree);

      const result = findClaudePid(100);
      expect(result).toBeNull();
    });
  });

  describe('isClaude matching', () => {
    it('matches basename case-insensitively via comm', () => {
      setupProcessTree({
        100: { comm: 'Claude', ppid: 1 }
      });

      const result = findClaudePid(100);
      expect(result).toBe(100);
    });

    it('falls back to args regex when comm does not match', () => {
      setupProcessTree({
        100: { comm: 'node', args: '/usr/local/bin/claude --help', ppid: 1 }
      });

      const result = findClaudePid(100);
      expect(result).toBe(100);
    });
  });

  it('PROCESS_TREE_MAX_DEPTH is 10', () => {
    expect(PROCESS_TREE_MAX_DEPTH).toBe(10);
  });
});
