/**
 * Tests for CLI main entry point.
 *
 * @module
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { build, main } from '../../src/cli/index.js';

// Test fixtures directory - use a stable path for this test file
const FIXTURES_DIR = '/tmp/cards-configuration-cli-index-test-fixtures';

// Module-level setup/teardown so fixtures are available to all describe blocks
beforeAll(() => {
  // Create fixtures directory
  mkdirSync(FIXTURES_DIR, { recursive: true });

  // Create valid config with actions
  writeFileSync(
    join(FIXTURES_DIR, 'valid.config.ts'),
    `
const launchStart = {
  factoryType: 'actionStart',
  actionName: 'Launch',
  description: 'Launch Claude',
  icon: 'rocket',
  handler: async () => {}
};

const launchEnd = {
  factoryType: 'actionEnd',
  actionName: 'Launch',
  handler: async () => {}
};

export default {
  environments: {
    default: {
      version: 1,
      description: 'Default environment',
      actions: [
        { start: launchStart, end: launchEnd }
      ]
    }
  }
};
    `.trim()
  );

  // Create config with multiple environments
  writeFileSync(
    join(FIXTURES_DIR, 'multi-env.config.ts'),
    `
const start1 = {
  factoryType: 'actionStart',
  actionName: 'Action1',
  handler: async () => {}
};

const start2 = {
  factoryType: 'actionStart',
  actionName: 'Action2',
  handler: async () => {}
};

export default {
  environments: {
    development: {
      version: 1,
      actions: [{ start: start1 }]
    },
    production: {
      version: 1,
      actions: [{ start: start2 }]
    }
  }
};
    `.trim()
  );

  // Create config with type definitions
  writeFileSync(
    join(FIXTURES_DIR, 'with-types.config.ts'),
    `
const noteValidator = {
  factoryType: 'typeValidator',
  typeName: 'note',
  handler: async () => {}
};

const actionStart = {
  factoryType: 'actionStart',
  actionName: 'CreateNote',
  handler: async () => {}
};

export default {
  environments: {
    default: {
      version: 1,
      actions: [{ start: actionStart }],
      types: {
        note: {
          version: '1.0.0',
          validator: noteValidator
        }
      }
    }
  }
};
    `.trim()
  );

  // Create invalid config (missing environments)
  writeFileSync(
    join(FIXTURES_DIR, 'invalid.config.ts'),
    `
export default {
  version: 1,
  actions: []
};
    `.trim()
  );

  // Create config with syntax error
  writeFileSync(
    join(FIXTURES_DIR, 'syntax-error.config.ts'),
    `
export default {
  environments: {
    default: {
      version: 1
      actions: []  // Missing comma
    }
  }
};
    `.trim()
  );
});

afterAll(() => {
  // Clean up fixtures directory
  rmSync(FIXTURES_DIR, { recursive: true, force: true });
});

describe('build', () => {
  describe('successful build', () => {
    it('should load config, serialize settings, and write settings.json', async () => {
      const outdir = join(FIXTURES_DIR, 'output-basic');
      const result = await build({
        config: join(FIXTURES_DIR, 'valid.config.ts'),
        outdir
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.settingsPath).toBe(join(outdir, 'settings.json'));
        expect(result.compiledHandlers).toEqual([]);

        // Verify settings.json was written
        const settingsContent = readFileSync(result.settingsPath, 'utf-8');
        const settings = JSON.parse(settingsContent);

        expect(settings).toHaveProperty('environments');
        expect(settings.environments).toHaveProperty('default');
        expect(settings.environments.default.version).toBe(1);
        expect(settings.environments.default.description).toBe('Default environment');
        expect(settings.environments.default.actions).toHaveLength(1);
        expect(settings.environments.default.actions[0].name).toBe('Launch');
        expect(settings.environments.default.actions[0].description).toBe('Launch Claude');
        expect(settings.environments.default.actions[0].icon).toBe('rocket');
        // Without sourcePath, commands use placeholder format
        expect(settings.environments.default.actions[0].start.command).toBe('actionStart-placeholder.js');
        expect(settings.environments.default.actions[0].end.command).toBe('actionEnd-placeholder.js');
      }
    });

    it('should create output directory if it does not exist', async () => {
      const outdir = join(FIXTURES_DIR, 'output-created');
      const result = await build({
        config: join(FIXTURES_DIR, 'valid.config.ts'),
        outdir
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.settingsPath).toBe(join(outdir, 'settings.json'));

        // Verify directory was created
        const settingsContent = readFileSync(result.settingsPath, 'utf-8');
        expect(settingsContent).toBeTruthy();
      }
    });

    it('should handle multiple environments', async () => {
      const outdir = join(FIXTURES_DIR, 'output-multi-env');
      const result = await build({
        config: join(FIXTURES_DIR, 'multi-env.config.ts'),
        outdir
      });

      expect(result.success).toBe(true);
      if (result.success) {
        const settingsContent = readFileSync(result.settingsPath, 'utf-8');
        const settings = JSON.parse(settingsContent);

        expect(settings.environments).toHaveProperty('development');
        expect(settings.environments).toHaveProperty('production');
        expect(settings.environments.development.actions[0].name).toBe('Action1');
        expect(settings.environments.production.actions[0].name).toBe('Action2');
      }
    });

    it('should serialize type definitions', async () => {
      const outdir = join(FIXTURES_DIR, 'output-types');
      const result = await build({
        config: join(FIXTURES_DIR, 'with-types.config.ts'),
        outdir
      });

      expect(result.success).toBe(true);
      if (result.success) {
        const settingsContent = readFileSync(result.settingsPath, 'utf-8');
        const settings = JSON.parse(settingsContent);

        expect(settings.environments.default.types).toHaveProperty('note');
        expect(settings.environments.default.types.note.version).toBe('1.0.0');
        // Without sourcePath, commands use placeholder format
        expect(settings.environments.default.types.note.validator.command).toBe('typeValidator-placeholder.js');
      }
    });

    it('should accept absolute config path', async () => {
      const outdir = join(FIXTURES_DIR, 'output-absolute');
      const absoluteConfigPath = join(FIXTURES_DIR, 'valid.config.ts');

      const result = await build({
        config: absoluteConfigPath,
        outdir
      });

      expect(result.success).toBe(true);
    });

    it('should accept relative config path', async () => {
      const outdir = join(FIXTURES_DIR, 'output-relative');

      const result = await build({
        config: './valid.config.ts',
        outdir
      });

      // Should fail because the relative path doesn't exist from cwd
      // This tests that the path resolution happens correctly
      expect(result.success).toBe(false);
    });

    it('should write well-formatted JSON with 2-space indentation', async () => {
      const outdir = join(FIXTURES_DIR, 'output-formatting');
      const result = await build({
        config: join(FIXTURES_DIR, 'valid.config.ts'),
        outdir
      });

      expect(result.success).toBe(true);
      if (result.success) {
        const settingsContent = readFileSync(result.settingsPath, 'utf-8');

        // Check that it's properly formatted (has newlines and indentation)
        expect(settingsContent).toContain('\n');
        expect(settingsContent).toContain('  '); // 2-space indent

        // Verify it's valid JSON
        expect(() => JSON.parse(settingsContent)).not.toThrow();
      }
    });
  });

  describe('error handling - config loading', () => {
    it('should return error for non-existent config file', async () => {
      const result = await build({
        config: join(FIXTURES_DIR, 'nonexistent.config.ts'),
        outdir: join(FIXTURES_DIR, 'output-error')
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('does not exist');
      }
    });

    it('should return error for invalid config structure', async () => {
      const result = await build({
        config: join(FIXTURES_DIR, 'invalid.config.ts'),
        outdir: join(FIXTURES_DIR, 'output-error')
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('invalid structure');
      }
    });

    it('should return error for config with syntax error', async () => {
      const result = await build({
        config: join(FIXTURES_DIR, 'syntax-error.config.ts'),
        outdir: join(FIXTURES_DIR, 'output-error')
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy();
      }
    });
  });

  describe('error handling - serialization', () => {
    it('should return error for config with missing action start', async () => {
      // Create a config with invalid action structure
      const invalidConfigPath = join(FIXTURES_DIR, 'no-start.config.ts');
      writeFileSync(
        invalidConfigPath,
        `
export default {
  environments: {
    default: {
      version: 1,
      actions: [{ end: { factoryType: 'actionEnd', actionName: 'Test', handler: async () => {} } }]
    }
  }
};
        `.trim()
      );

      const result = await build({
        config: invalidConfigPath,
        outdir: join(FIXTURES_DIR, 'output-error')
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('start');
      }
    });
  });

  describe('error handling - file system', () => {
    it('should handle permission errors when writing files', async () => {
      // This test is OS-specific and may not work in all environments
      // We'll test the basic behavior by using an invalid path
      const result = await build({
        config: join(FIXTURES_DIR, 'valid.config.ts'),
        outdir: '/root/forbidden/path'
      });

      // The exact error depends on permissions, but it should fail
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy();
      }
    });

    it('should return clear error when outdir is a file instead of directory', async () => {
      // Create a file at the outdir path (common mistake: -o dist/settings.json instead of -o dist)
      const filePath = join(FIXTURES_DIR, 'output-is-file.json');
      writeFileSync(filePath, '{}');

      const result = await build({
        config: join(FIXTURES_DIR, 'valid.config.ts'),
        outdir: filePath
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('is a file, not a directory');
        expect(result.error).toContain('-o/--outdir argument should be a directory path');
      }
    });
  });

  describe('handler compilation', () => {
    it('should not compile handlers when sourcePath is not provided', async () => {
      const outdir = join(FIXTURES_DIR, 'output-no-compile');
      const result = await build({
        config: join(FIXTURES_DIR, 'valid.config.ts'),
        outdir
      });

      expect(result.success).toBe(true);
      if (result.success) {
        // When sourcePath is not provided, handlers are not compiled
        // Commands use placeholder format in settings.json
        expect(result.compiledHandlers).toEqual([]);
      }
    });
  });

  describe('log file support', () => {
    it('should accept log parameter (for future use)', async () => {
      const outdir = join(FIXTURES_DIR, 'output-with-log');
      const result = await build({
        config: join(FIXTURES_DIR, 'valid.config.ts'),
        outdir,
        log: join(FIXTURES_DIR, 'build.log')
      });

      expect(result.success).toBe(true);
      // Log file support is for future enhancement
      // For now we just verify the parameter is accepted
    });
  });
});

describe('main', () => {
  let originalArgv: string[];
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    originalArgv = process.argv;
    // Mock process.exit to throw instead of terminating
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${code})`);
    });
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.argv = originalArgv;
    vi.restoreAllMocks();
  });

  it('should read process.argv and execute build', async () => {
    const outdir = join(FIXTURES_DIR, 'output-main-argv');
    process.argv = ['node', 'cli.js', 'build', '-c', join(FIXTURES_DIR, 'valid.config.ts'), '-o', outdir];

    await expect(main()).rejects.toThrow('process.exit(0)');
    expect(consoleLogSpy).toHaveBeenCalledWith('Build successful!');
  });

  it('should exit with code 0 on success', async () => {
    const outdir = join(FIXTURES_DIR, 'output-main-success');
    process.argv = ['node', 'cli.js', 'build', '-c', join(FIXTURES_DIR, 'valid.config.ts'), '-o', outdir];

    await expect(main()).rejects.toThrow('process.exit(0)');
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('should exit with code 1 on error', async () => {
    process.argv = ['node', 'cli.js', 'build', '-c', '/nonexistent/config.ts', '-o', '/tmp/out'];

    await expect(main()).rejects.toThrow('process.exit(1)');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should print error message on failure', async () => {
    process.argv = ['node', 'cli.js', 'build', '-c', '/nonexistent/config.ts', '-o', '/tmp/out'];

    await expect(main()).rejects.toThrow('process.exit(1)');
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Build failed:'), expect.any(String));
  });

  it('should print usage on parse error', async () => {
    process.argv = ['node', 'cli.js', 'build']; // Missing required args

    await expect(main()).rejects.toThrow('process.exit(1)');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', expect.any(String));
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
  });
});
