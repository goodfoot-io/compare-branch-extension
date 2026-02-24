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
        const pid = Number.parseInt(commMatch[1]!, 10);
        const entry = tree[pid];
        if (!entry) throw new Error(`ps: pid ${pid} not found`);
        return `${entry.comm}\n`;
      }

      const argsMatch = cmd.match(/ps -p (\d+) -o args=/);
      if (argsMatch) {
        const pid = Number.parseInt(argsMatch[1]!, 10);
        const entry = tree[pid];
        if (!entry) throw new Error(`ps: pid ${pid} not found`);
        return `${entry.args ?? entry.comm}\n`;
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

    it('matches standalone "claude" in args', () => {
      setupProcessTree({
        100: { comm: 'node', args: 'claude', ppid: 1 }
      });

      expect(findClaudePid(100)).toBe(100);
    });

    it('matches "claude" preceded by whitespace in args', () => {
      setupProcessTree({
        100: { comm: 'node', args: 'node claude --arg', ppid: 1 }
      });

      expect(findClaudePid(100)).toBe(100);
    });

    it('does NOT match .claude/ directory paths in args', () => {
      setupProcessTree({
        100: {
          comm: 'zsh',
          args: '/bin/zsh -c -l source /home/node/.claude/shell-snapshots/snapshot.sh',
          ppid: 200
        },
        200: { comm: 'claude', ppid: 1 }
      });

      // Should skip PID 100 (false positive on .claude/ path) and find 200
      const result = findClaudePid(100);
      expect(result).toBe(200);
    });

    it('does NOT match .claude/ when it is the only claude-like string in args', () => {
      setupProcessTree({
        100: {
          comm: 'node',
          args: '/home/node/.claude/plugins/cache/session-start.mjs',
          ppid: 1
        }
      });

      expect(findClaudePid(100)).toBeNull();
    });

    it('matches versioned Claude executable in args', () => {
      setupProcessTree({
        100: {
          comm: '2.1.51',
          args: '/home/node/.local/share/claude/versions/2.1.51 --agent-id impl-evaluator@eval-main',
          ppid: 1
        }
      });

      expect(findClaudePid(100)).toBe(100);
    });

    it('matches versioned Claude executable with different version numbers', () => {
      setupProcessTree({
        100: {
          comm: '10.20.300',
          args: '/home/node/.local/share/claude/versions/10.20.300 --agent-name e2e-evaluator',
          ppid: 1
        }
      });

      expect(findClaudePid(100)).toBe(100);
    });

    it('finds versioned Claude ancestor in process tree', () => {
      setupProcessTree({
        100: { comm: 'bash', ppid: 200 },
        200: {
          comm: '2.1.51',
          args: '/home/node/.local/share/claude/versions/2.1.51 --agent-id impl-evaluator@eval-main',
          ppid: 300
        },
        300: { comm: 'zsh', ppid: 1 }
      });

      const result = findClaudePid(100);
      expect(result).toBe(200);
    });

    it('finds both named and versioned Claude processes in tree', () => {
      setupProcessTree({
        100: { comm: 'bash', ppid: 200 },
        200: {
          comm: '2.1.51',
          args: '/home/node/.local/share/claude/versions/2.1.51 --agent-id impl-evaluator@eval-main',
          ppid: 300
        },
        300: { comm: 'zsh', ppid: 400 },
        400: { comm: 'claude', ppid: 1 }
      });

      const result = findAllClaudePids(100);
      expect(result).toEqual([200, 400]);
    });
  });

  it('PROCESS_TREE_MAX_DEPTH is 10', () => {
    expect(PROCESS_TREE_MAX_DEPTH).toBe(10);
  });
});
