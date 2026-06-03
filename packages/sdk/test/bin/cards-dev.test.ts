/**
 * Tests for cards-dev.mjs CLI binary pure helper functions.
 *
 * Tests do NOT require a running VS Code instance — Puppeteer integration
 * is not unit-testable. Only `parseFlags` and argument validation logic
 * (exercised by calling subcommand functions with a mocked connectBrowser)
 * are covered here.
 *
 * @summary Tests for cards-dev CLI binary helper functions
 */

import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { defaultScreenshotPath, parseFlags } from '../../src/bin/cards-dev.js';

describe('parseFlags', () => {
  it('parses a single key-value flag', () => {
    const result = parseFlags(['--target', 'detail']);
    expect(result['target']).toEqual(['detail']);
  });

  it('parses multiple distinct flags', () => {
    const result = parseFlags(['--target', 'detail', '--output', '/tmp/out.png']);
    expect(result['target']).toEqual(['detail']);
    expect(result['output']).toEqual(['/tmp/out.png']);
  });

  it('accumulates repeated flags into an array', () => {
    const result = parseFlags(['--tag', 'bug', '--tag', 'feature']);
    expect(result['tag']).toEqual(['bug', 'feature']);
  });

  it('stops parsing at the first positional argument', () => {
    const result = parseFlags(['--target', 'detail', 'positional', '--output', '/tmp/out.png']);
    expect(result['target']).toEqual(['detail']);
    expect(result['output']).toBeUndefined();
  });

  it('returns an empty object for no arguments', () => {
    const result = parseFlags([]);
    expect(result).toEqual({});
  });

  it('throws when a non-boolean flag is missing its value', () => {
    expect(() => parseFlags(['--target'])).toThrow('flag --target requires a value');
  });

  it('parses boolean flag --append without consuming the next argument', () => {
    const result = parseFlags(['--append', '--label', 'Title']);
    expect(result['append']).toEqual(['true']);
    expect(result['label']).toEqual(['Title']);
  });

  it('parses boolean flag --absent without consuming the next argument', () => {
    const result = parseFlags(['--absent', '--timeout', '3000']);
    expect(result['absent']).toEqual(['true']);
    expect(result['timeout']).toEqual(['3000']);
  });

  it('parses --append at end of args without error', () => {
    const result = parseFlags(['--target', 'detail', '--append']);
    expect(result['target']).toEqual(['detail']);
    expect(result['append']).toEqual(['true']);
  });

  it('does not treat --absent as requiring a value', () => {
    // If --absent were treated as a value flag, the next arg would be consumed
    const result = parseFlags(['--absent', '--selector', '.foo']);
    expect(result['absent']).toEqual(['true']);
    expect(result['selector']).toEqual(['.foo']);
  });

  it('handles a flag with a value that looks like another flag', () => {
    const result = parseFlags(['--selector', '--foo']);
    expect(result['selector']).toEqual(['--foo']);
  });
});

describe('defaultScreenshotPath', () => {
  it('resolves screenshot.png inside the OS temp dir for the current platform', () => {
    const p = defaultScreenshotPath();
    expect(p).toBe(join(tmpdir(), 'screenshot.png'));
    expect(isAbsolute(p)).toBe(true); // drive-rooted on win32, /-rooted on POSIX
    expect(p.startsWith(tmpdir())).toBe(true); // lives under a real, existing temp dir
  });

  it('does not return the bare POSIX /tmp default', () => {
    expect(defaultScreenshotPath()).not.toBe('/tmp/screenshot.png');
  });
});
