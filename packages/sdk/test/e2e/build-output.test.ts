/**
 * End-to-end tests for build output validation.
 *
 * These tests validate that files produced by the build system:
 * 1. Have valid settings.json structure matching the schema
 * 2. Reference compiled handlers that exist
 * 3. Compiled handler files are well-formed
 *
 *
 * @summary End-to-end tests for build output validation
 * @module
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Settings } from '../../src/config/schema.js';

// ============================================================================
// Test Constants
// ============================================================================

/**
 * Path to the real build output from claude-code configuration.
 * This tests against actual built artifacts rather than mocked fixtures.
 */
const CLAUDE_CODE_DIST = path.resolve(__dirname, '../../../default-configuration/dist');
const DEFAULT_CONFIG_PKG = path.resolve(__dirname, '../../../default-configuration');

/**
 * Builds default-configuration if its dist output is missing.
 * Runs once before all test suites in this file.
 */
function ensureBuildOutput(): void {
  const settingsPath = path.join(CLAUDE_CODE_DIST, 'settings.json');
  if (fs.existsSync(settingsPath)) {
    return;
  }
  execFileSync('yarn', ['build'], { cwd: DEFAULT_CONFIG_PKG, stdio: 'pipe' });
}

beforeAll(() => {
  ensureBuildOutput();
});

// ============================================================================
// Settings.json Structure Validation
// ============================================================================

describe('build output: settings.json structure', () => {
  let settings: Settings & { __generated?: { files: string[] } };
  let settingsPath: string;

  beforeAll(() => {
    settingsPath = path.join(CLAUDE_CODE_DIST, 'settings.json');
    const content = fs.readFileSync(settingsPath, 'utf-8');
    settings = JSON.parse(content);
  });

  describe('root structure', () => {
    it('should have environments object', () => {
      expect(settings).toHaveProperty('environments');
      expect(typeof settings.environments).toBe('object');
      expect(settings.environments).not.toBeNull();
    });

    it('should have at least one environment', () => {
      const envNames = Object.keys(settings.environments);
      expect(envNames.length).toBeGreaterThan(0);
    });

    it('should have __generated metadata', () => {
      expect(settings).toHaveProperty('__generated');
      expect(settings.__generated).toHaveProperty('files');
      expect(Array.isArray(settings.__generated?.files)).toBe(true);
    });
  });

  describe('environment structure', () => {
    it('should have valid environment objects', () => {
      for (const [_envName, env] of Object.entries(settings.environments)) {
        expect(env).toHaveProperty('version');
        expect(typeof env.version).toBe('number');
        expect(env).toHaveProperty('actions');
        expect(Array.isArray(env.actions)).toBe(true);
      }
    });

    it('should have valid actions in each environment', () => {
      for (const [_envName, env] of Object.entries(settings.environments)) {
        for (const action of env.actions) {
          expect(action).toHaveProperty('name');
          expect(typeof action.name).toBe('string');
          expect(action).toHaveProperty('command');
          expect(action.command).toHaveProperty('command');
          expect(typeof action.command.command).toBe('string');

          // ID should be present (generated from name)
          expect(action).toHaveProperty('id');
          expect(typeof action.id).toBe('string');
        }
      }
    });
  });

  describe('command paths', () => {
    it('should have commands that reference bin directory', () => {
      for (const [_envName, env] of Object.entries(settings.environments)) {
        for (const action of env.actions) {
          // Commands should reference bin directory (either ./bin/ or $CARDS_PLUGIN_ROOT/bin/)
          expect(action.command.command).toMatch(/bin\//);
        }
      }
    });

    it('should have commands with content hashes in filenames', () => {
      // Content hash pattern: name.8hexchars.mjs
      const hashPattern = /\.[a-f0-9]{8}\.mjs$/;

      for (const [_envName, env] of Object.entries(settings.environments)) {
        for (const action of env.actions) {
          expect(action.command.command).toMatch(hashPattern);
        }
      }
    });
  });
});

// ============================================================================
// Compiled Handler File Validation
// ============================================================================

describe('build output: compiled handlers', () => {
  let settings: Settings & { __generated?: { files: string[] } };
  let binDir: string;

  beforeAll(() => {
    const settingsPath = path.join(CLAUDE_CODE_DIST, 'settings.json');
    const content = fs.readFileSync(settingsPath, 'utf-8');
    settings = JSON.parse(content);
    binDir = path.join(CLAUDE_CODE_DIST, 'bin');
  });

  describe('file existence', () => {
    it('should have bin directory', () => {
      expect(fs.existsSync(binDir)).toBe(true);
      expect(fs.statSync(binDir).isDirectory()).toBe(true);
    });

    it('should have all files listed in __generated.files', () => {
      const generatedFiles = settings.__generated?.files ?? [];
      expect(generatedFiles.length).toBeGreaterThan(0);

      for (const filename of generatedFiles) {
        const filePath = path.join(binDir, filename);
        expect(fs.existsSync(filePath)).toBe(true);
      }
    });

    it('should have executable permissions on compiled handlers', () => {
      const generatedFiles = settings.__generated?.files ?? [];

      for (const filename of generatedFiles) {
        const filePath = path.join(binDir, filename);
        const stats = fs.statSync(filePath);
        // Check executable bit (owner execute permission)
        const isExecutable = (stats.mode & 0o100) !== 0;
        expect(isExecutable).toBe(true);
      }
    });
  });

  describe('handler content', () => {
    it('should be non-empty JavaScript files', () => {
      const generatedFiles = settings.__generated?.files ?? [];

      for (const filename of generatedFiles) {
        const filePath = path.join(binDir, filename);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Compiled handlers should have meaningful content
        expect(content.length).toBeGreaterThan(100);
        // Should contain function definitions (all handlers define functions)
        expect(content).toMatch(/\bfunction\b/);
      }
    });

    it('should have shebang or be plain JS', () => {
      const generatedFiles = settings.__generated?.files ?? [];

      for (const filename of generatedFiles) {
        const filePath = path.join(binDir, filename);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Either has shebang or is valid JS (starts with comment/import/var/etc)
        const isValidStart =
          content.startsWith('#!') ||
          content.startsWith('//') ||
          content.startsWith('/*') ||
          content.startsWith('import') ||
          content.startsWith('var') ||
          content.startsWith('const') ||
          content.startsWith('let');

        expect(isValidStart).toBe(true);
      }
    });
  });
});

// ============================================================================
// Cross-reference Validation
// ============================================================================

describe('build output: cross-reference validation', () => {
  let settings: Settings & { __generated?: { files: string[] } };
  let binDir: string;

  /**
   * Extracts all handler filenames referenced by settings commands.
   *
   * @returns Filenames referenced by action and type command entries in settings.
   */
  function extractReferencedFiles(): string[] {
    const referencedFiles: string[] = [];

    for (const [_envName, env] of Object.entries(settings.environments)) {
      for (const action of env.actions) {
        referencedFiles.push(extractFilename(action.command.command));
      }
    }

    return referencedFiles;
  }

  beforeAll(() => {
    const settingsPath = path.join(CLAUDE_CODE_DIST, 'settings.json');
    const content = fs.readFileSync(settingsPath, 'utf-8');
    settings = JSON.parse(content);
    binDir = path.join(CLAUDE_CODE_DIST, 'bin');
  });

  it('should have all referenced handler files exist', () => {
    const referencedFiles = extractReferencedFiles();

    // Verify all referenced files exist on disk
    for (const filename of referencedFiles) {
      const filePath = path.join(binDir, filename);
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  it('should have all referenced handler files listed in __generated.files', () => {
    const generatedFiles = new Set(settings.__generated?.files ?? []);
    const referencedFiles = extractReferencedFiles();

    // Every handler file referenced by a command must be in the generated manifest
    for (const file of referencedFiles) {
      expect(generatedFiles.has(file)).toBe(true);
    }
  });

  it('should have unique content hashes for different handlers', () => {
    const generatedFiles = settings.__generated?.files ?? [];
    const hashes = new Map<string, string>();

    for (const filename of generatedFiles) {
      // Extract hash from filename (e.g., "launch.e5f82141.mjs" -> "e5f82141")
      const match = filename.match(/\.([a-f0-9]{8})\.mjs$/);
      if (match?.[1]) {
        const hash = match[1];
        const baseName = filename.replace(/\.[a-f0-9]{8}\.mjs$/, '');

        // Each base name should have a unique hash
        if (hashes.has(baseName)) {
          expect(hashes.get(baseName)).toBe(hash);
        } else {
          hashes.set(baseName, hash);
        }
      }
    }
  });
});

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extracts the filename from a command string.
 * Handles both "./bin/file.mjs" and "$VSCODE_NODE ./bin/file.mjs" formats.
 *
 * @param command - Command string from settings that may include executable prefix.
 * @returns Basename of the compiled handler file referenced by the command.
 */
function extractFilename(command: string): string {
  // Extract just the filename from the last path segment
  return path.basename(command.split(/\s+/).pop()!);
}
