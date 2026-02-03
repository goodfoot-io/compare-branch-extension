/**
 * Tests for exit codes module.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EXIT_CODES, type ExitCode, exitWithError, type HookExecutionResult, writeError } from '../src/exit-codes.js';

describe('EXIT_CODES', () => {
  it('has SUCCESS as 0', () => {
    expect(EXIT_CODES.SUCCESS).toBe(0);
  });

  it('has ERROR as 1', () => {
    expect(EXIT_CODES.ERROR).toBe(1);
  });

  it('only has SUCCESS and ERROR', () => {
    const keys = Object.keys(EXIT_CODES);
    expect(keys).toHaveLength(2);
    expect(keys).toContain('SUCCESS');
    expect(keys).toContain('ERROR');
  });
});

describe('writeError', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
  });

  it('writes message to stderr with newline', () => {
    writeError('Test error message');
    expect(stderrSpy).toHaveBeenCalledWith('Test error message\n');
  });

  it('handles empty string', () => {
    writeError('');
    expect(stderrSpy).toHaveBeenCalledWith('\n');
  });

  it('handles messages with newlines', () => {
    writeError('Line 1\nLine 2');
    expect(stderrSpy).toHaveBeenCalledWith('Line 1\nLine 2\n');
  });
});

describe('exitWithError', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('writes error message and exits with ERROR code', () => {
    expect(() => exitWithError('Fatal error')).toThrow('process.exit called');
    expect(stderrSpy).toHaveBeenCalledWith('Fatal error\n');
    expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ERROR);
  });
});

describe('HookExecutionResult type', () => {
  it('can create success result', () => {
    const result: HookExecutionResult = {
      success: true,
      exitCode: EXIT_CODES.SUCCESS
    };
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.error).toBeUndefined();
  });

  it('can create error result with error', () => {
    const error = new Error('Test error');
    const result: HookExecutionResult = {
      success: false,
      exitCode: EXIT_CODES.ERROR,
      error
    };
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toBe(error);
  });
});

describe('ExitCode type', () => {
  it('accepts valid exit codes', () => {
    const successCode: ExitCode = 0;
    const errorCode: ExitCode = 1;
    expect(successCode).toBe(EXIT_CODES.SUCCESS);
    expect(errorCode).toBe(EXIT_CODES.ERROR);
  });
});
