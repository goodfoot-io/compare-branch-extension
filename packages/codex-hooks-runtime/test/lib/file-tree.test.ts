/**
 * Tests for prefix-compressed file tree rendering.
 *
 * @summary Tests for lib/file-tree
 */

import { describe, expect, it } from 'vitest';
import { formatCommitLog, formatFileTree } from '../../src/lib/file-tree.js';

describe('formatFileTree', () => {
  it('returns empty string for empty input', () => {
    expect(formatFileTree([])).toBe('');
  });

  it('renders a single file without indentation', () => {
    expect(formatFileTree(['README.md'])).toBe(' README.md');
  });

  it('renders a single file in a directory with collapsed path', () => {
    expect(formatFileTree(['src/index.ts'])).toBe(' src/index.ts');
  });

  it('collapses single-child directory chains', () => {
    const result = formatFileTree(['src/lib/utils/helper.ts']);
    expect(result).toBe(' src/lib/utils/helper.ts');
  });

  it('groups files under a shared prefix', () => {
    const result = formatFileTree(['src/lib/context.ts', 'src/lib/file-tree.ts']);
    expect(result).toBe(' src/lib/\n' + '   context.ts\n' + '   file-tree.ts');
  });

  it('handles multiple directories at the root level', () => {
    const result = formatFileTree(['src/index.ts', 'test/index.test.ts']);
    expect(result).toBe(' src/index.ts\n' + ' test/index.test.ts');
  });

  it('collapses shared prefixes but splits at divergence points', () => {
    const result = formatFileTree(['src/lib/context.ts', 'src/lib/file-tree.ts', 'src/stop.ts']);
    expect(result).toBe(' src/\n' + '   lib/\n' + '     context.ts\n' + '     file-tree.ts\n' + '   stop.ts');
  });

  it('handles deeply nested files with mixed depths', () => {
    const result = formatFileTree([
      'packages/runtime/src/lib/context.ts',
      'packages/runtime/src/stop.ts',
      'packages/runtime/test/stop.test.ts'
    ]);
    expect(result).toBe(
      ' packages/runtime/\n' + '   src/\n' + '     lib/context.ts\n' + '     stop.ts\n' + '   test/stop.test.ts'
    );
  });

  it('handles root-level files mixed with directories', () => {
    const result = formatFileTree(['CARD.md', 'CARD.meta.json', 'comment/abc123.md']);
    // Directories sort before files at each level
    expect(result).toBe(' comment/abc123.md\n' + ' CARD.md\n' + ' CARD.meta.json');
  });

  it('sorts entries alphabetically within each level', () => {
    const result = formatFileTree(['src/z.ts', 'src/a.ts', 'src/m.ts']);
    expect(result).toBe(' src/\n' + '   a.ts\n' + '   m.ts\n' + '   z.ts');
  });

  it('sorts directories before files at the same level', () => {
    const result = formatFileTree(['src/index.ts', 'src/lib/utils.ts']);
    expect(result).toBe(' src/\n' + '   lib/utils.ts\n' + '   index.ts');
  });
});

describe('formatCommitLog', () => {
  it('handles NUL-delimited commits', () => {
    const raw = '\0abc1234 - First commit\n\nfile1.ts\nfile2.ts\0def5678 - Second commit\n\nfile3.ts';
    const result = formatCommitLog(raw, 'nul');
    expect(result).toContain('abc1234 - First commit');
    expect(result).toContain('file1.ts');
    expect(result).toContain('file2.ts');
    expect(result).toContain('def5678 - Second commit');
    expect(result).toContain('file3.ts');
  });

  it('handles blank-line-delimited commits', () => {
    const raw = 'abc1234 - First commit\n\nfile1.ts\nfile2.ts\n\ndef5678 - Second commit\n\nfile3.ts';
    const result = formatCommitLog(raw, 'blank-line');
    expect(result).toContain('abc1234 - First commit');
    expect(result).toContain('def5678 - Second commit');
  });

  it('applies tree formatting to file lists', () => {
    const raw = 'abc1234 - commit\n\nsrc/lib/a.ts\nsrc/lib/b.ts';
    const result = formatCommitLog(raw, 'blank-line');
    // Files should be tree-formatted under shared prefix
    expect(result).toContain('src/lib/');
    expect(result).toContain('a.ts');
    expect(result).toContain('b.ts');
  });

  it('handles commits with no files', () => {
    const raw = 'abc1234 - empty commit';
    const result = formatCommitLog(raw, 'blank-line');
    expect(result).toBe('abc1234 - empty commit');
  });

  it('preserves commit header lines exactly', () => {
    const raw = '\0abc1234 - feat: implement auth\n\nsrc/auth.ts';
    const result = formatCommitLog(raw, 'nul');
    expect(result).toContain('abc1234 - feat: implement auth');
  });

  it('returns empty string for empty input', () => {
    expect(formatCommitLog('', 'nul')).toBe('');
    expect(formatCommitLog('', 'blank-line')).toBe('');
  });
});
