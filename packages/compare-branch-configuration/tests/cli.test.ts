/**
 * Unit tests for CLI functions.
 *
 * Tests:
 * - parseArgs for various input combinations
 * - validateArgs error conditions
 * - analyzeHookFile extracts correct metadata from sample hook files
 * - HOOK_FACTORY_TO_EVENT mapping
 * - detectHookContext for different directory structures
 * - generateCommandPath for plugin and agent contexts
 * - generateContentHash produces consistent results
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { CliArgs } from '../src/cli.js';
import {
  analyzeHookFile,
  detectHookContext,
  generateCommandPath,
  generateContentHash,
  HOOK_FACTORY_TO_EVENT,
  parseArgs,
  validateArgs
} from '../src/cli.js';

describe('HOOK_FACTORY_TO_EVENT', () => {
  it('maps all 4 hook factory names to event names', () => {
    expect(Object.keys(HOOK_FACTORY_TO_EVENT)).toHaveLength(4);
  });

  it('maps startCardHook to StartCard', () => {
    expect(HOOK_FACTORY_TO_EVENT.startCardHook).toBe('StartCard');
  });

  it('maps endCardHook to EndCard', () => {
    expect(HOOK_FACTORY_TO_EVENT.endCardHook).toBe('EndCard');
  });

  it('maps startInterviewHook to StartInterview', () => {
    expect(HOOK_FACTORY_TO_EVENT.startInterviewHook).toBe('StartInterview');
  });

  it('maps endInterviewHook to EndInterview', () => {
    expect(HOOK_FACTORY_TO_EVENT.endInterviewHook).toBe('EndInterview');
  });
});

describe('parseArgs', () => {
  it('returns empty values for empty argv', () => {
    const result = parseArgs([]);

    expect(result.input).toBe('');
    expect(result.output).toBe('');
    expect(result.log).toBeUndefined();
    expect(result.help).toBe(false);
    expect(result.version).toBe(false);
  });

  it('parses -i/--input flag', () => {
    expect(parseArgs(['-i', 'hooks/**/*.ts']).input).toBe('hooks/**/*.ts');
    expect(parseArgs(['--input', 'src/hooks/*.ts']).input).toBe('src/hooks/*.ts');
  });

  it('parses -o/--output flag', () => {
    expect(parseArgs(['-o', './dist/hooks.json']).output).toBe('./dist/hooks.json');
    expect(parseArgs(['--output', './build/hooks.json']).output).toBe('./build/hooks.json');
  });

  it('parses --log flag', () => {
    expect(parseArgs(['--log', './build.log']).log).toBe('./build.log');
  });

  it('parses -h/--help flag', () => {
    expect(parseArgs(['-h']).help).toBe(true);
    expect(parseArgs(['--help']).help).toBe(true);
  });

  it('parses -v/--version flag', () => {
    expect(parseArgs(['-v']).version).toBe(true);
    expect(parseArgs(['--version']).version).toBe(true);
  });

  it('parses --executable flag', () => {
    expect(parseArgs(['--executable', '/usr/local/bin/node']).executable).toBe('/usr/local/bin/node');
  });

  it('parses multiple flags together', () => {
    const result = parseArgs(['-i', 'hooks/**/*.ts', '-o', './dist/hooks.json', '--log', './build.log']);

    expect(result.input).toBe('hooks/**/*.ts');
    expect(result.output).toBe('./dist/hooks.json');
    expect(result.log).toBe('./build.log');
  });

  it('ignores unknown flags', () => {
    const result = parseArgs(['--unknown', 'value', '-i', 'hooks/*.ts']);

    expect(result.input).toBe('hooks/*.ts');
  });

  it('handles missing values for flags', () => {
    // If value is missing, it becomes empty string
    const result = parseArgs(['-i']);

    expect(result.input).toBe('');
  });

  it('handles flags in any order', () => {
    const result = parseArgs(['--log', './log.txt', '-o', './out.json', '-i', 'src/**/*.ts']);

    expect(result.input).toBe('src/**/*.ts');
    expect(result.output).toBe('./out.json');
    expect(result.log).toBe('./log.txt');
  });
});

describe('validateArgs', () => {
  it('returns undefined for valid args with input and output', () => {
    const args: CliArgs = {
      input: 'hooks/**/*.ts',
      output: './dist/hooks.json',
      help: false,
      version: false
    };

    expect(validateArgs(args)).toBeUndefined();
  });

  it('returns undefined when help flag is set', () => {
    const args: CliArgs = {
      input: '',
      output: '',
      help: true,
      version: false
    };

    expect(validateArgs(args)).toBeUndefined();
  });

  it('returns undefined when version flag is set', () => {
    const args: CliArgs = {
      input: '',
      output: '',
      help: false,
      version: true
    };

    expect(validateArgs(args)).toBeUndefined();
  });

  it('returns error when input is missing', () => {
    const args: CliArgs = {
      input: '',
      output: './dist/hooks.json',
      help: false,
      version: false
    };

    const error = validateArgs(args);

    expect(error).toBe('Missing required argument: -i/--input <glob>');
  });

  it('returns error when output is missing', () => {
    const args: CliArgs = {
      input: 'hooks/**/*.ts',
      output: '',
      help: false,
      version: false
    };

    const error = validateArgs(args);

    expect(error).toBe('Missing required argument: -o/--output <path>');
  });

  it('returns input error first when both missing', () => {
    const args: CliArgs = {
      input: '',
      output: '',
      help: false,
      version: false
    };

    const error = validateArgs(args);

    expect(error).toBe('Missing required argument: -i/--input <glob>');
  });
});

describe('analyzeHookFile', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-test-'));
  });

  afterEach(() => {
    // Clean up temp files
    const files = fs.readdirSync(tempDir);
    for (const file of files) {
      fs.unlinkSync(path.join(tempDir, file));
    }
    fs.rmdirSync(tempDir);
  });

  function writeHookFile(filename: string, content: string): string {
    const filePath = path.join(tempDir, filename);
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  it('extracts StartCard hook', () => {
    const filePath = writeHookFile(
      'start-card.ts',
      `
      import { startCardHook } from '@goodfoot/compare-branch-configuration';

      export default startCardHook({}, async (input, { logger }) => {
        logger.info('Card started', { cardId: input.cardId });
      });
    `
    );

    const metadata = analyzeHookFile(filePath);

    expect(metadata?.hookEventName).toBe('StartCard');
  });

  it('extracts EndCard hook', () => {
    const filePath = writeHookFile(
      'end-card.ts',
      `
      import { endCardHook } from '@goodfoot/compare-branch-configuration';

      export default endCardHook({}, async (input, { logger }) => {
        logger.info('Card ended', { cardId: input.cardId });
      });
    `
    );

    const metadata = analyzeHookFile(filePath);

    expect(metadata?.hookEventName).toBe('EndCard');
  });

  it('extracts StartInterview hook', () => {
    const filePath = writeHookFile(
      'start-interview.ts',
      `
      import { startInterviewHook } from '@goodfoot/compare-branch-configuration';

      export default startInterviewHook({}, async (input, { logger }) => {
        logger.info('Interview started');
      });
    `
    );

    const metadata = analyzeHookFile(filePath);

    expect(metadata?.hookEventName).toBe('StartInterview');
  });

  it('extracts EndInterview hook', () => {
    const filePath = writeHookFile(
      'end-interview.ts',
      `
      import { endInterviewHook } from '@goodfoot/compare-branch-configuration';

      export default endInterviewHook({}, async (input, { logger }) => {
        logger.info('Interview ended');
      });
    `
    );

    const metadata = analyzeHookFile(filePath);

    expect(metadata?.hookEventName).toBe('EndInterview');
  });

  it('returns undefined for non-hook file', () => {
    const filePath = writeHookFile(
      'not-a-hook.ts',
      `
      export default function regularFunction() {
        console.log('Not a hook');
      }
    `
    );

    const metadata = analyzeHookFile(filePath);

    expect(metadata).toBeUndefined();
  });

  it('handles parenthesized export default', () => {
    const filePath = writeHookFile(
      'parenthesized.ts',
      `
      import { startCardHook } from '@goodfoot/compare-branch-configuration';

      export default (startCardHook({}, async (input) => {}));
    `
    );

    const metadata = analyzeHookFile(filePath);

    expect(metadata?.hookEventName).toBe('StartCard');
  });

  it('handles namespace-qualified hook factory', () => {
    const filePath = writeHookFile(
      'namespace.ts',
      `
      import * as hooks from '@goodfoot/compare-branch-configuration';

      export default hooks.startCardHook({}, async (input) => {});
    `
    );

    const metadata = analyzeHookFile(filePath);

    expect(metadata?.hookEventName).toBe('StartCard');
  });
});

describe('detectHookContext', () => {
  it('detects agent context from .claude/ path', () => {
    const outputPath = '/project/.claude/hooks/hooks.json';
    const result = detectHookContext(outputPath);

    expect(result.context).toBe('agent');
    expect(result.rootDir).toBe('/project');
  });

  it('detects agent context from nested .claude/ path', () => {
    const outputPath = '/home/user/myproject/.claude/hooks/dist/hooks.json';
    const result = detectHookContext(outputPath);

    expect(result.context).toBe('agent');
    expect(result.rootDir).toBe('/home/user/myproject');
  });

  it('defaults to plugin context when no .claude/ in path', () => {
    const outputPath = '/project/dist/hooks.json';
    const result = detectHookContext(outputPath);

    expect(result.context).toBe('plugin');
    expect(result.rootDir).toBe('/project/dist');
  });

  it('handles Windows-style paths', () => {
    const outputPath = 'C:\\project\\.claude\\hooks\\hooks.json';
    const result = detectHookContext(outputPath);

    expect(result.context).toBe('agent');
    expect(result.rootDir).toBe('C:/project');
  });
});

describe('generateCommandPath', () => {
  it('generates plugin command path with default executable', () => {
    const contextInfo = {
      context: 'plugin' as const,
      rootDir: '/plugin-root'
    };
    const buildDir = '/plugin-root/hooks/bin';
    const filename = 'my-hook.abc123.mjs';

    const result = generateCommandPath(filename, buildDir, contextInfo);

    expect(result).toBe('node $COMPARE_BRANCH_PLUGIN_ROOT/hooks/bin/my-hook.abc123.mjs');
  });

  it('generates plugin command path with custom executable', () => {
    const contextInfo = {
      context: 'plugin' as const,
      rootDir: '/plugin-root'
    };
    const buildDir = '/plugin-root/dist/bin';
    const filename = 'hook.abc123.mjs';

    const result = generateCommandPath(filename, buildDir, contextInfo, '/usr/local/bin/node');

    expect(result).toBe('/usr/local/bin/node $COMPARE_BRANCH_PLUGIN_ROOT/dist/bin/hook.abc123.mjs');
  });

  it('generates agent command path with default executable', () => {
    const contextInfo = {
      context: 'agent' as const,
      rootDir: '/project'
    };
    const buildDir = '/project/.claude/hooks/bin';
    const filename = 'my-hook.def456.mjs';

    const result = generateCommandPath(filename, buildDir, contextInfo);

    expect(result).toBe('node "$CLAUDE_PROJECT_DIR"/.claude/hooks/bin/my-hook.def456.mjs');
  });

  it('generates agent command path with custom executable', () => {
    const contextInfo = {
      context: 'agent' as const,
      rootDir: '/home/user/project'
    };
    const buildDir = '/home/user/project/.claude/hooks/bin';
    const filename = 'hook.ghi789.mjs';

    const result = generateCommandPath(filename, buildDir, contextInfo, 'node22');

    expect(result).toBe('node22 "$CLAUDE_PROJECT_DIR"/.claude/hooks/bin/hook.ghi789.mjs');
  });

  it('normalizes relative paths to forward slashes', () => {
    const contextInfo = {
      context: 'plugin' as const,
      rootDir: '/plugin'
    };
    const buildDir = '/plugin/hooks/bin';
    const filename = 'hook.abc123.mjs';

    const result = generateCommandPath(filename, buildDir, contextInfo);

    // The result should use forward slashes even if path.sep differs
    expect(result).toContain('/hooks/bin/hook.abc123.mjs');
    expect(result).not.toContain('\\');
  });
});

describe('generateContentHash', () => {
  it('generates 8-character hash', () => {
    const content = 'test content';
    const hash = generateContentHash(content);

    expect(hash).toHaveLength(8);
    expect(/^[0-9a-f]{8}$/.test(hash)).toBe(true);
  });

  it('generates consistent hash for same content', () => {
    const content = 'test content';
    const hash1 = generateContentHash(content);
    const hash2 = generateContentHash(content);

    expect(hash1).toBe(hash2);
  });

  it('generates different hashes for different content', () => {
    const content1 = 'test content 1';
    const content2 = 'test content 2';
    const hash1 = generateContentHash(content1);
    const hash2 = generateContentHash(content2);

    expect(hash1).not.toBe(hash2);
  });

  it('generates expected hash for known input', () => {
    const content = 'test';
    const expectedHash = crypto.createHash('sha256').update(content).digest('hex').substring(0, 8);
    const hash = generateContentHash(content);

    expect(hash).toBe(expectedHash);
  });
});
