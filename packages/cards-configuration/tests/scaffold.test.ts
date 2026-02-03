/**
 * Tests for the scaffold module.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { scaffoldProject } from '../src/scaffold.js';

describe('scaffoldProject', () => {
  let tempDir: string;
  let projectDir: string;

  beforeEach(() => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffold-test-'));
    projectDir = path.join(tempDir, 'test-hooks');
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('hook name validation', () => {
    it('accepts valid hook names', () => {
      scaffoldProject({
        directory: projectDir,
        hooks: ['StartCard', 'EndCard'],
        outputPath: 'dist/hooks.json'
      });

      expect(fs.existsSync(projectDir)).toBe(true);
    });

    it('accepts case-insensitive hook names', () => {
      scaffoldProject({
        directory: projectDir,
        hooks: ['startcard', 'ENDCARD', 'StartInterview'],
        outputPath: 'dist/hooks.json'
      });

      expect(fs.existsSync(projectDir)).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'src', 'start-card.ts'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'src', 'end-card.ts'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'src', 'start-interview.ts'))).toBe(true);
    });

    it('rejects invalid hook names', () => {
      const originalStderr = process.stderr.write;
      const originalExit = process.exit;
      let exitCode: number | undefined;
      let stderrOutput = '';

      // Mock process.exit and stderr
      process.exit = ((code: number) => {
        exitCode = code;
        throw new Error(`process.exit(${code})`);
      }) as never;
      process.stderr.write = ((chunk: string) => {
        stderrOutput += chunk;
        return true;
      }) as never;

      try {
        scaffoldProject({
          directory: projectDir,
          hooks: ['InvalidHook'],
          outputPath: 'dist/hooks.json'
        });
      } catch (_error) {
        // Expected to throw due to mocked process.exit
      } finally {
        process.exit = originalExit;
        process.stderr.write = originalStderr;
      }

      expect(exitCode).toBe(1);
      expect(stderrOutput).toContain('Invalid hook name(s): InvalidHook');
      expect(stderrOutput).toContain('Valid hook names:');
    });

    it('accepts all valid hook event names', () => {
      scaffoldProject({
        directory: projectDir,
        hooks: ['StartCard', 'EndCard', 'StartInterview', 'EndInterview'],
        outputPath: 'dist/hooks.json'
      });

      expect(fs.existsSync(path.join(projectDir, 'src', 'start-card.ts'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'src', 'end-card.ts'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'src', 'start-interview.ts'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'src', 'end-interview.ts'))).toBe(true);
    });
  });

  describe('directory structure', () => {
    it('creates project directory structure', () => {
      scaffoldProject({
        directory: projectDir,
        hooks: ['StartCard'],
        outputPath: 'dist/hooks.json'
      });

      expect(fs.existsSync(projectDir)).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'src'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'test'))).toBe(true);
    });

    it('fails if directory already exists', () => {
      const originalStderr = process.stderr.write;
      const originalExit = process.exit;
      let exitCode: number | undefined;
      let stderrOutput = '';

      // Create the directory first
      fs.mkdirSync(projectDir, { recursive: true });

      // Mock process.exit and stderr
      process.exit = ((code: number) => {
        exitCode = code;
        throw new Error(`process.exit(${code})`);
      }) as never;
      process.stderr.write = ((chunk: string) => {
        stderrOutput += chunk;
        return true;
      }) as never;

      try {
        scaffoldProject({
          directory: projectDir,
          hooks: ['StartCard'],
          outputPath: 'dist/hooks.json'
        });
      } catch (_error) {
        // Expected to throw due to mocked process.exit
      } finally {
        process.exit = originalExit;
        process.stderr.write = originalStderr;
      }

      expect(exitCode).toBe(1);
      expect(stderrOutput).toContain('Directory already exists');
    });
  });

  describe('file generation', () => {
    it('generates package.json with correct dependencies', () => {
      scaffoldProject({
        directory: projectDir,
        hooks: ['StartCard'],
        outputPath: 'dist/hooks.json'
      });

      const packageJsonPath = path.join(projectDir, 'package.json');
      expect(fs.existsSync(packageJsonPath)).toBe(true);

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      expect(packageJson.name).toBe('test-hooks');
      expect(packageJson.type).toBe('module');
      expect(packageJson.dependencies).toHaveProperty('@cards/configuration');
      expect(packageJson.scripts.build).toContain('cards-configuration');
      expect(packageJson.scripts.build).toContain('dist/hooks.json');
    });

    it('generates hook files for each requested hook', () => {
      scaffoldProject({
        directory: projectDir,
        hooks: ['StartCard', 'EndCard'],
        outputPath: 'dist/hooks.json'
      });

      const startCardPath = path.join(projectDir, 'src', 'start-card.ts');
      const endCardPath = path.join(projectDir, 'src', 'end-card.ts');

      expect(fs.existsSync(startCardPath)).toBe(true);
      expect(fs.existsSync(endCardPath)).toBe(true);

      const startCardContent = fs.readFileSync(startCardPath, 'utf-8');
      expect(startCardContent).toContain('startCardHook');
      expect(startCardContent).toContain('StartCard hook triggered');
      expect(startCardContent).not.toContain('return'); // No return statement

      const endCardContent = fs.readFileSync(endCardPath, 'utf-8');
      expect(endCardContent).toContain('endCardHook');
      expect(endCardContent).toContain('EndCard hook triggered');
      expect(endCardContent).not.toContain('return'); // No return statement
    });

    it('generates test files for each hook', () => {
      scaffoldProject({
        directory: projectDir,
        hooks: ['StartCard', 'StartInterview'],
        outputPath: 'dist/hooks.json'
      });

      const startCardTestPath = path.join(projectDir, 'test', 'start-card.test.ts');
      const startInterviewTestPath = path.join(projectDir, 'test', 'start-interview.test.ts');

      expect(fs.existsSync(startCardTestPath)).toBe(true);
      expect(fs.existsSync(startInterviewTestPath)).toBe(true);

      const startCardTestContent = fs.readFileSync(startCardTestPath, 'utf-8');
      expect(startCardTestContent).toContain('import hook from "../src/start-card.js"');
      expect(startCardTestContent).toContain('describe("StartCard Hook"');
      expect(startCardTestContent).toContain('cardId:');
      expect(startCardTestContent).toContain('executionWrapperPid:');
      expect(startCardTestContent).toContain('hookIpcSocket:');

      const startInterviewTestContent = fs.readFileSync(startInterviewTestPath, 'utf-8');
      expect(startInterviewTestContent).toContain('import hook from "../src/start-interview.js"');
      expect(startInterviewTestContent).toContain('describe("StartInterview Hook"');
    });

    it('generates configuration files', () => {
      scaffoldProject({
        directory: projectDir,
        hooks: ['StartCard'],
        outputPath: 'dist/hooks.json'
      });

      expect(fs.existsSync(path.join(projectDir, 'tsconfig.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'biome.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'vitest.config.ts'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'CLAUDE.md'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, '.gitignore'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'README.md'))).toBe(true);
    });

    it('generates README with hook list', () => {
      scaffoldProject({
        directory: projectDir,
        hooks: ['StartCard', 'EndCard'],
        outputPath: 'dist/hooks.json'
      });

      const readmePath = path.join(projectDir, 'README.md');
      const readmeContent = fs.readFileSync(readmePath, 'utf-8');

      expect(readmeContent).toContain('# test-hooks');
      expect(readmeContent).toContain('`StartCard`');
      expect(readmeContent).toContain('`EndCard`');
      expect(readmeContent).toContain('@cards/configuration');
    });
  });

  describe('kebab-case conversion', () => {
    it('converts PascalCase to kebab-case correctly', () => {
      scaffoldProject({
        directory: projectDir,
        hooks: ['StartCard', 'EndCard', 'StartInterview'],
        outputPath: 'dist/hooks.json'
      });

      expect(fs.existsSync(path.join(projectDir, 'src', 'start-card.ts'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'src', 'end-card.ts'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'src', 'start-interview.ts'))).toBe(true);
    });
  });
});
