/**
 * Tests for the `SystemRouter` component's fallback behavior.
 *
 * The `default:` arm used to return `null`, silently dropping any `system`
 * subtype the router didn't explicitly recognize. It now renders the shared
 * `RawFallback` so a future/unrecognized subtype stays visible instead of
 * vanishing without a trace.
 *
 * Rendered via `react-dom/server` (this package has no jsdom — see
 * `attachment-render.test.ts`), asserting on the resulting HTML string.
 *
 * @summary Unit tests for components/expanded/messages/system/SystemRouter
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SystemRouter } from '../src/streams/claude-code-session/www/components/expanded/messages/system/SystemRouter.js';
import type { SystemMsg } from '../src/streams/claude-code-session/www/lib/parse-session.js';

describe('SystemRouter — unrecognized subtype fallback', () => {
  it('renders the shared RawFallback (not nothing) for an unrecognized system subtype', () => {
    const msg = { type: 'system', subtype: 'some_future_subtype', extra: 'payload' } as SystemMsg;

    const html = renderToStaticMarkup(createElement(SystemRouter, { msg }));

    expect(html).not.toBe('');
    expect(html).toContain('Unrecognized system event');
    expect(html).toContain('some_future_subtype');
  });

  it('still renders null for a status subtype that is not compacting (no regression)', () => {
    const msg = { type: 'system', subtype: 'status', status: 'idle' } as SystemMsg;

    const html = renderToStaticMarkup(createElement(SystemRouter, { msg }));

    expect(html).toBe('');
  });
});
