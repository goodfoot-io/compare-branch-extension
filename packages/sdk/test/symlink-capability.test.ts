/**
 * Tests for {@link canCreateSymlinks} and {@link invalidateSymlinkCapability}.
 *
 * @summary Tests for symlink-capability probe
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canCreateSymlinks, invalidateSymlinkCapability } from '../src/symlink-capability.js';

// Stub fs.symlink so EPERM/EACCES branches are testable on Linux.
vi.mock('node:fs/promises', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...original,
    symlink: vi.fn<typeof original.symlink>()
  };
});

import * as fs from 'node:fs/promises';

describe('canCreateSymlinks', () => {
  // --------------------------------------------------------------------------
  // Shared reset
  // --------------------------------------------------------------------------

  beforeEach(() => {
    invalidateSymlinkCapability();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  // --------------------------------------------------------------------------
  // Non-Windows: short-circuits true
  // --------------------------------------------------------------------------

  describe('non-Windows platforms', () => {
    it('returns true on darwin without probing', async () => {
      vi.stubEnv('_original_platform', process.platform);
      Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });

      const symlinkSpy = vi.mocked(fs.symlink);
      const result = await canCreateSymlinks();
      expect(result).toBe(true);
      expect(symlinkSpy).not.toHaveBeenCalled();

      Object.defineProperty(process, 'platform', { value: process.env['_original_platform'], configurable: true });
    });

    it('returns true on linux without probing', async () => {
      vi.stubEnv('_original_platform', process.platform);
      Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });

      const symlinkSpy = vi.mocked(fs.symlink);
      const result = await canCreateSymlinks();
      expect(result).toBe(true);
      expect(symlinkSpy).not.toHaveBeenCalled();

      Object.defineProperty(process, 'platform', { value: process.env['_original_platform'], configurable: true });
    });
  });

  // --------------------------------------------------------------------------
  // Windows: probes with real symlink
  // --------------------------------------------------------------------------

  describe('Windows', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
    });

    afterEach(() => {
      Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    });

    it('returns true when symlink succeeds', async () => {
      vi.mocked(fs.symlink).mockResolvedValueOnce(undefined);
      // mkdtemp / writeFile / rm are passthrough (real fs), but the temp dir
      // is created and cleaned up. Mock symlink to succeed so the probe path is
      // exercised without real platform coupling.
      const result = await canCreateSymlinks();
      expect(result).toBe(true);
    });

    it('returns false when symlink fails with EPERM', async () => {
      const epermError = Object.assign(new Error('operation not permitted'), { code: 'EPERM' });
      vi.mocked(fs.symlink).mockRejectedValueOnce(epermError);

      const result = await canCreateSymlinks();
      expect(result).toBe(false);
    });

    it('returns false when symlink fails with EACCES', async () => {
      const eaccesError = Object.assign(new Error('permission denied'), { code: 'EACCES' });
      vi.mocked(fs.symlink).mockRejectedValueOnce(eaccesError);

      const result = await canCreateSymlinks();
      expect(result).toBe(false);
    });

    it('returns false (fail-closed) on unexpected errors', async () => {
      const unexpectedError = Object.assign(new Error('disk full'), { code: 'ENOSPC' });
      vi.mocked(fs.symlink).mockRejectedValueOnce(unexpectedError);

      const result = await canCreateSymlinks();
      expect(result).toBe(false);
    });

    it('includes error code in stderr message for unexpected errors', async () => {
      const unexpectedError = Object.assign(new Error('disk full'), { code: 'ENOSPC' });
      vi.mocked(fs.symlink).mockRejectedValueOnce(unexpectedError);
      const chunks: string[] = [];
      const origWrite = process.stderr.write.bind(process.stderr);
      process.stderr.write = ((chunk: string | Uint8Array) => {
        chunks.push(typeof chunk === 'string' ? chunk : chunk.toString());
        return true;
      }) as typeof process.stderr.write;

      try {
        const result = await canCreateSymlinks();
        expect(result).toBe(false);
        const stderrText = chunks.join('');
        expect(stderrText).toContain('code=ENOSPC');
        expect(stderrText).toContain('message=disk full');
      } finally {
        process.stderr.write = origWrite;
      }
    });

    it('writes code=unknown to stderr when error has no code', async () => {
      const noCodeError = new Error('some mystery');
      vi.mocked(fs.symlink).mockRejectedValueOnce(noCodeError);
      const chunks: string[] = [];
      const origWrite = process.stderr.write.bind(process.stderr);
      process.stderr.write = ((chunk: string | Uint8Array) => {
        chunks.push(typeof chunk === 'string' ? chunk : chunk.toString());
        return true;
      }) as typeof process.stderr.write;

      try {
        const result = await canCreateSymlinks();
        expect(result).toBe(false);
        const stderrText = chunks.join('');
        expect(stderrText).toContain('code=unknown');
      } finally {
        process.stderr.write = origWrite;
      }
    });
  });

  // --------------------------------------------------------------------------
  // Caching
  // --------------------------------------------------------------------------

  describe('caching', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
    });

    afterEach(() => {
      Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    });

    it('reuses the cached result on subsequent calls', async () => {
      vi.mocked(fs.symlink).mockResolvedValueOnce(undefined);

      const first = await canCreateSymlinks();
      const second = await canCreateSymlinks();

      expect(first).toBe(true);
      expect(second).toBe(true);
      // symlink called exactly once — the second call returned the cached result.
      expect(vi.mocked(fs.symlink)).toHaveBeenCalledTimes(1);
    });

    it('shares the probe across concurrent callers', async () => {
      vi.mocked(fs.symlink).mockResolvedValueOnce(undefined);

      const [first, second] = await Promise.all([canCreateSymlinks(), canCreateSymlinks()]);

      expect(first).toBe(true);
      expect(second).toBe(true);
      expect(vi.mocked(fs.symlink)).toHaveBeenCalledTimes(1);
    });

    it('re-probes after invalidateSymlinkCapability', async () => {
      vi.mocked(fs.symlink).mockResolvedValueOnce(undefined);
      await canCreateSymlinks();
      expect(vi.mocked(fs.symlink)).toHaveBeenCalledTimes(1);

      invalidateSymlinkCapability();
      vi.mocked(fs.symlink).mockResolvedValueOnce(undefined);
      await canCreateSymlinks();
      expect(vi.mocked(fs.symlink)).toHaveBeenCalledTimes(2);
    });
  });
});
