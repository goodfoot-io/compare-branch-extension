import { describe, expect, it } from 'vitest';
import { parseArgs } from '../../../src/configuration/cli/args.js';

describe('parseArgs', () => {
  describe('successful parsing', () => {
    it('should parse short flags (-c, -o)', () => {
      const result = parseArgs(['build', '-c', 'settings.config.ts', '-o', 'dist/']);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.command).toBe('build');
        expect(result.args.config).toBe('settings.config.ts');
        expect(result.args.outdir).toBe('dist/');
        expect(result.args.log).toBeUndefined();
      }
    });

    it('should parse long flags (--config, --outdir)', () => {
      const result = parseArgs(['build', '--config', 'settings.config.ts', '--outdir', 'dist/']);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.command).toBe('build');
        expect(result.args.config).toBe('settings.config.ts');
        expect(result.args.outdir).toBe('dist/');
        expect(result.args.log).toBeUndefined();
      }
    });

    it('should parse mixed short and long flags', () => {
      const result = parseArgs(['build', '-c', 'settings.config.ts', '--outdir', 'dist/']);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.command).toBe('build');
        expect(result.args.config).toBe('settings.config.ts');
        expect(result.args.outdir).toBe('dist/');
      }
    });

    it('should parse optional --log flag', () => {
      const result = parseArgs(['build', '-c', 'settings.config.ts', '-o', 'dist/', '--log', 'build.log']);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.command).toBe('build');
        expect(result.args.config).toBe('settings.config.ts');
        expect(result.args.outdir).toBe('dist/');
        expect(result.args.log).toBe('build.log');
      }
    });

    it('should handle flags in any order', () => {
      const result = parseArgs(['build', '--log', 'build.log', '-o', 'dist/', '-c', 'settings.config.ts']);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.command).toBe('build');
        expect(result.args.config).toBe('settings.config.ts');
        expect(result.args.outdir).toBe('dist/');
        expect(result.args.log).toBe('build.log');
      }
    });

    it('should handle paths with spaces', () => {
      const result = parseArgs(['build', '-c', 'path/to/settings.config.ts', '-o', 'output/build dir/']);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.args.config).toBe('path/to/settings.config.ts');
        expect(result.args.outdir).toBe('output/build dir/');
      }
    });
  });

  describe('error handling - missing command', () => {
    it('should return error for missing command', () => {
      const result = parseArgs([]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('command');
      }
    });

    it('should return error for unknown command', () => {
      const result = parseArgs(['test', '-c', 'settings.config.ts', '-o', 'dist/']);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Unknown command');
        expect(result.error).toContain('test');
      }
    });
  });

  describe('error handling - missing required arguments', () => {
    it('should return error for missing --config', () => {
      const result = parseArgs(['build', '-o', 'dist/']);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('--config');
        expect(result.error).toContain('required');
      }
    });

    it('should return error for missing --outdir', () => {
      const result = parseArgs(['build', '-c', 'settings.config.ts']);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('--outdir');
        expect(result.error).toContain('required');
      }
    });

    it('should return error for missing both required arguments', () => {
      const result = parseArgs(['build']);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('--config');
        expect(result.error).toContain('required');
      }
    });
  });

  describe('error handling - missing argument values', () => {
    it('should return error for --config without value', () => {
      const result = parseArgs(['build', '-c', '-o', 'dist/']);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('--config');
        expect(result.error).toContain('value');
      }
    });

    it('should return error for --outdir without value', () => {
      const result = parseArgs(['build', '-c', 'settings.config.ts', '-o']);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('--outdir');
        expect(result.error).toContain('value');
      }
    });

    it('should return error for --log without value', () => {
      const result = parseArgs(['build', '-c', 'settings.config.ts', '-o', 'dist/', '--log']);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('--log');
        expect(result.error).toContain('value');
      }
    });
  });

  describe('error handling - unknown flags', () => {
    it('should return error for unknown flag', () => {
      const result = parseArgs(['build', '-c', 'settings.config.ts', '-o', 'dist/', '--verbose']);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Unknown flag');
        expect(result.error).toContain('--verbose');
      }
    });

    it('should return error for unknown short flag', () => {
      const result = parseArgs(['build', '-c', 'settings.config.ts', '-o', 'dist/', '-v']);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Unknown flag');
        expect(result.error).toContain('-v');
      }
    });
  });
});
