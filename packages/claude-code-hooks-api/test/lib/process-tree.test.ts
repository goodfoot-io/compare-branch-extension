import { execSync } from 'node:child_process';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findClaudePid, PROCESS_TREE_MAX_DEPTH } from '../../src/lib/process-tree.js';

/**
 * Exercises process tree behavior in the lib area through focused scenarios.
 * The cases lock in edge handling and regression coverage so refactors preserve expected state
 * transitions and output.
 *
 * @summary Tests process tree behavior in lib
 */

vi.mock('node:child_process', () => ({
  execSync: vi.fn()
}));

const mockExecSync = vi.mocked(execSync);

describe('findClaudePid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when no claude process in tree (walks up to init)', () => {
    mockExecSync.mockImplementation((cmd: string) => {
      const cmdStr = cmd.toString();
      if (cmdStr.includes('-o comm=')) {
        if (cmdStr.includes('-p 1000')) return 'node\n';
        if (cmdStr.includes('-p 500')) return 'bash\n';
        if (cmdStr.includes('-p 1')) return 'init\n';
      }
      if (cmdStr.includes('-o args=')) {
        if (cmdStr.includes('-p 1000')) return 'node script.js\n';
        if (cmdStr.includes('-p 500')) return 'bash\n';
        if (cmdStr.includes('-p 1')) return '/sbin/init\n';
      }
      if (cmdStr.includes('-o ppid=')) {
        if (cmdStr.includes('-p 1000')) return '500\n';
        if (cmdStr.includes('-p 500')) return '1\n';
      }
      throw new Error('Process not found');
    });

    const result = findClaudePid(1000);
    expect(result).toBeNull();
  });

  it('should return PID when process named "claude" found via comm basename', () => {
    mockExecSync.mockImplementation((cmd: string) => {
      const cmdStr = cmd.toString();
      if (cmdStr.includes('-o comm=')) {
        if (cmdStr.includes('-p 1000')) return 'node\n';
        if (cmdStr.includes('-p 500')) return 'claude\n';
      }
      if (cmdStr.includes('-o args=')) {
        if (cmdStr.includes('-p 1000')) return 'node script.js\n';
        if (cmdStr.includes('-p 500')) return 'claude\n';
      }
      if (cmdStr.includes('-o ppid=')) {
        if (cmdStr.includes('-p 1000')) return '500\n';
        if (cmdStr.includes('-p 500')) return '100\n';
      }
      throw new Error('Process not found');
    });

    const result = findClaudePid(1000);
    expect(result).toBe(500);
  });

  it('should return PID when found via args fallback (e.g., node /path/to/claude)', () => {
    mockExecSync.mockImplementation((cmd: string) => {
      const cmdStr = cmd.toString();
      if (cmdStr.includes('-o comm=')) {
        if (cmdStr.includes('-p 1000')) return 'git\n';
        if (cmdStr.includes('-p 500')) return 'node\n';
      }
      if (cmdStr.includes('-o args=')) {
        if (cmdStr.includes('-p 1000')) return 'git commit\n';
        if (cmdStr.includes('-p 500')) return 'node /usr/local/bin/claude\n';
      }
      if (cmdStr.includes('-o ppid=')) {
        if (cmdStr.includes('-p 1000')) return '500\n';
        if (cmdStr.includes('-p 500')) return '100\n';
      }
      throw new Error('Process not found');
    });

    const result = findClaudePid(1000);
    expect(result).toBe(500);
  });

  it('should handle macOS full-path comm output (e.g., /usr/local/bin/claude)', () => {
    mockExecSync.mockImplementation((cmd: string) => {
      const cmdStr = cmd.toString();
      if (cmdStr.includes('-o comm=')) {
        if (cmdStr.includes('-p 1000')) return 'git\n';
        if (cmdStr.includes('-p 500')) return '/usr/local/bin/claude\n';
      }
      if (cmdStr.includes('-o args=')) {
        if (cmdStr.includes('-p 1000')) return 'git commit\n';
        if (cmdStr.includes('-p 500')) return '/usr/local/bin/claude\n';
      }
      if (cmdStr.includes('-o ppid=')) {
        if (cmdStr.includes('-p 1000')) return '500\n';
        if (cmdStr.includes('-p 500')) return '100\n';
      }
      throw new Error('Process not found');
    });

    const result = findClaudePid(1000);
    expect(result).toBe(500);
  });

  it('should handle execSync errors gracefully (returns null)', () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('ps: process not found');
    });

    const result = findClaudePid(1000);
    expect(result).toBeNull();
  });

  it('should NOT fall back to current PID when claude not found', () => {
    mockExecSync.mockImplementation((cmd: string) => {
      const cmdStr = cmd.toString();
      if (cmdStr.includes('-o comm=')) {
        if (cmdStr.includes('-p 1000')) return 'node\n';
        if (cmdStr.includes('-p 500')) return 'bash\n';
        if (cmdStr.includes('-p 1')) return 'init\n';
      }
      if (cmdStr.includes('-o args=')) {
        if (cmdStr.includes('-p 1000')) return 'node script.js\n';
        if (cmdStr.includes('-p 500')) return 'bash\n';
        if (cmdStr.includes('-p 1')) return '/sbin/init\n';
      }
      if (cmdStr.includes('-o ppid=')) {
        if (cmdStr.includes('-p 1000')) return '500\n';
        if (cmdStr.includes('-p 500')) return '1\n';
      }
      throw new Error('Process not found');
    });

    const result = findClaudePid(1000);
    expect(result).toBeNull();
    expect(result).not.toBe(process.pid);
  });

  it('should return null when starting PID is 1 (init)', () => {
    const result = findClaudePid(1);
    expect(result).toBeNull();
  });

  it('should accept optional startPid parameter (defaults to process.ppid)', () => {
    mockExecSync.mockImplementation((cmd: string) => {
      const cmdStr = cmd.toString();
      if (cmdStr.includes('-o comm=')) {
        if (cmdStr.includes('-p 999')) return 'claude\n';
      }
      throw new Error('Process not found');
    });

    const result = findClaudePid(999);
    expect(result).toBe(999);
  });

  it('should match case-insensitively ("Claude", "claude", "CLAUDE")', () => {
    mockExecSync.mockImplementation((cmd: string) => {
      const cmdStr = cmd.toString();
      if (cmdStr.includes('-o comm=')) {
        if (cmdStr.includes('-p 1000')) return 'git\n';
        if (cmdStr.includes('-p 500')) return 'Claude\n';
      }
      if (cmdStr.includes('-o args=')) {
        if (cmdStr.includes('-p 1000')) return 'git commit\n';
        if (cmdStr.includes('-p 500')) return 'Claude\n';
      }
      if (cmdStr.includes('-o ppid=')) {
        if (cmdStr.includes('-p 1000')) return '500\n';
        if (cmdStr.includes('-p 500')) return '100\n';
      }
      throw new Error('Process not found');
    });

    const resultCapital = findClaudePid(1000);
    expect(resultCapital).toBe(500);

    vi.clearAllMocks();

    mockExecSync.mockImplementation((cmd: string) => {
      const cmdStr = cmd.toString();
      if (cmdStr.includes('-o comm=')) {
        if (cmdStr.includes('-p 1000')) return 'git\n';
        if (cmdStr.includes('-p 500')) return 'CLAUDE\n';
      }
      if (cmdStr.includes('-o args=')) {
        if (cmdStr.includes('-p 1000')) return 'git commit\n';
        if (cmdStr.includes('-p 500')) return 'CLAUDE\n';
      }
      if (cmdStr.includes('-o ppid=')) {
        if (cmdStr.includes('-p 1000')) return '500\n';
        if (cmdStr.includes('-p 500')) return '100\n';
      }
      throw new Error('Process not found');
    });

    const resultAllCaps = findClaudePid(1000);
    expect(resultAllCaps).toBe(500);
  });

  it('should walk parent chain up to max depth', () => {
    mockExecSync.mockImplementation((cmd: string) => {
      const cmdStr = cmd.toString();
      const match = cmdStr.match(/-p (\d+)/);
      if (!match || !match[1]) throw new Error('Invalid command');

      const pid = Number.parseInt(match[1], 10);

      if (cmdStr.includes('-o comm=')) {
        return 'bash\n';
      }
      if (cmdStr.includes('-o args=')) {
        return 'bash\n';
      }
      if (cmdStr.includes('-o ppid=')) {
        const parentPid = pid - 100;
        if (parentPid < 1) return '1\n';
        return `${parentPid}\n`;
      }
      throw new Error('Process not found');
    });

    const result = findClaudePid(1000);
    expect(result).toBeNull();

    expect(mockExecSync).toHaveBeenCalledTimes(PROCESS_TREE_MAX_DEPTH * 3);
  });

  it('should stop when ppid equals current pid (cycle detection)', () => {
    mockExecSync.mockImplementation((cmd: string) => {
      const cmdStr = cmd.toString();
      if (cmdStr.includes('-o comm=')) {
        return 'bash\n';
      }
      if (cmdStr.includes('-o args=')) {
        return 'bash\n';
      }
      if (cmdStr.includes('-o ppid=')) {
        const match = cmdStr.match(/-p (\d+)/);
        if (!match) throw new Error('Invalid command');
        return `${match[1]}\n`;
      }
      throw new Error('Process not found');
    });

    const result = findClaudePid(1000);
    expect(result).toBeNull();
  });
});
