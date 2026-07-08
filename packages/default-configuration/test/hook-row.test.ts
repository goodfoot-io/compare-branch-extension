/**
 * Tests for the shared `HookRow` component and its `hookBodyText` helper.
 *
 * Covers the auto-detected JSON/markdown/plain-text body rendering and the
 * always-shown `hookSpecificOutput` table — the two additions that stop hook
 * bodies from ever reaching the user as an opaque, unformatted blob.
 *
 * Rendered via `react-dom/server` (this package has no jsdom — see
 * `attachment-render.test.ts`), asserting on the resulting HTML string.
 *
 * @summary Unit tests for components/accordions/HookRow
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HookRow, hookBodyText } from '../src/streams/claude-code-session/www/components/accordions/HookRow.js';
import type { AttachmentPayload } from '../src/streams/claude-code-session/www/lib/parse-session.js';

describe('hookBodyText', () => {
  it('joins stdout, stderr, and content for hook_success, skipping empty fields', () => {
    const hook = { type: 'hook_success', stdout: 'ran ok', stderr: '', content: '' } as AttachmentPayload;
    expect(hookBodyText(hook)).toBe('ran ok');
  });

  it('returns null for hook_success with no stdout/stderr/content', () => {
    const hook = { type: 'hook_success', stdout: '', stderr: '', content: '' } as AttachmentPayload;
    expect(hookBodyText(hook)).toBeNull();
  });

  it('joins the blocking reason and command for hook_blocking_error', () => {
    const hook = {
      type: 'hook_blocking_error',
      blockingError: { blockingError: 'branch is behind', command: 'git pull' }
    } as AttachmentPayload;
    expect(hookBodyText(hook)).toBe('branch is behind\n\ngit pull');
  });

  it('joins array content for hook_additional_context', () => {
    const hook = { type: 'hook_additional_context', content: ['line one', 'line two'] } as AttachmentPayload;
    expect(hookBodyText(hook)).toBe('line one\nline two');
  });
});

describe('HookRow — body auto-detection', () => {
  it('renders a JSON-shaped hook_success body through the shared JsonBlock, pretty-printed', () => {
    const hook = {
      type: 'hook_success',
      hookName: 'PostToolUse:Bash',
      hookEvent: 'PostToolUse',
      toolUseID: 'T1',
      stdout: '{"ok":true,"count":3}',
      stderr: '',
      content: '',
      exitCode: 0
    } as AttachmentPayload;

    const html = renderToStaticMarkup(createElement(HookRow, { hook }));
    expect(html).toContain('json-block');
    // Pretty-printed (2-space indent), not the original single-line string.
    expect(html).toContain('&quot;ok&quot;: true');
    expect(html).not.toContain('{&quot;ok&quot;:true,&quot;count&quot;:3}');
  });

  it('renders a markdown-shaped hook_success body as structured HTML, not literal syntax', () => {
    const hook = {
      type: 'hook_success',
      hookName: 'PostToolUse:Bash',
      hookEvent: 'PostToolUse',
      toolUseID: 'T1',
      stdout: '## Result\n\n- passed\n- 3 checks',
      stderr: '',
      content: '',
      exitCode: 0
    } as AttachmentPayload;

    const html = renderToStaticMarkup(createElement(HookRow, { hook }));
    expect(html).toContain('<h2');
    expect(html).toContain('<li>passed</li>');
    expect(html).not.toContain('## Result');
  });

  it('renders a plain-text hook_success body as pre-wrapped text', () => {
    const hook = {
      type: 'hook_success',
      hookName: 'PostToolUse:Bash',
      hookEvent: 'PostToolUse',
      toolUseID: 'T1',
      stdout: 'just some plain shell output',
      stderr: '',
      content: '',
      exitCode: 0
    } as AttachmentPayload;

    const html = renderToStaticMarkup(createElement(HookRow, { hook }));
    expect(html).toContain('just some plain shell output');
    expect(html).not.toContain('json-block');
  });

  it('always renders hook_system_message body through markdown, even when it looks like plain prose', () => {
    const hook = {
      type: 'hook_system_message',
      hookName: 'SessionStart',
      hookEvent: 'SessionStart',
      toolUseID: 'T1',
      content: 'Plain single-line prose with no markdown markers.'
    } as AttachmentPayload;

    const html = renderToStaticMarkup(createElement(HookRow, { hook }));
    expect(html).toContain('<p>Plain single-line prose with no markdown markers.</p>');
  });
});

describe('HookRow — hookSpecificOutput', () => {
  it('renders a "Hook-specific output" table when hookSpecificOutput is a non-empty object', () => {
    const hook = {
      type: 'hook_success',
      hookName: 'PostToolUse:Bash',
      hookEvent: 'PostToolUse',
      toolUseID: 'T1',
      stdout: '',
      stderr: '',
      content: '',
      exitCode: 0,
      hookSpecificOutput: { additionalContext: 'extra note', permission: 'allow' }
    } as unknown as AttachmentPayload;

    const html = renderToStaticMarkup(createElement(HookRow, { hook }));
    expect(html).toContain('Hook-specific output');
    expect(html).toContain('additionalContext');
    expect(html).toContain('extra note');
  });

  it('makes the row expandable via hookSpecificOutput alone, even with no free-text body', () => {
    const hook = {
      type: 'hook_success',
      hookName: 'PostToolUse:Bash',
      hookEvent: 'PostToolUse',
      toolUseID: 'T1',
      stdout: '',
      stderr: '',
      content: '',
      exitCode: 0,
      hookSpecificOutput: { permission: 'allow' }
    } as unknown as AttachmentPayload;

    const html = renderToStaticMarkup(createElement(HookRow, { hook }));
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('Hook-specific output');
  });

  it('omits the hookSpecificOutput section and collapses to a non-expandable row when absent and body is empty', () => {
    const hook = {
      type: 'hook_success',
      hookName: 'PostToolUse:Bash',
      hookEvent: 'PostToolUse',
      toolUseID: 'T1',
      stdout: '',
      stderr: '',
      content: '',
      exitCode: 0
    } as AttachmentPayload;

    const html = renderToStaticMarkup(createElement(HookRow, { hook }));
    expect(html).not.toContain('Hook-specific output');
    expect(html).not.toContain('aria-expanded');
  });

  it('omits the hookSpecificOutput section when it is an empty object', () => {
    const hook = {
      type: 'hook_success',
      hookName: 'PostToolUse:Bash',
      hookEvent: 'PostToolUse',
      toolUseID: 'T1',
      stdout: 'ran fine',
      stderr: '',
      content: '',
      exitCode: 0,
      hookSpecificOutput: {}
    } as unknown as AttachmentPayload;

    const html = renderToStaticMarkup(createElement(HookRow, { hook }));
    expect(html).not.toContain('Hook-specific output');
  });
});
