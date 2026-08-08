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
import type { Frame, Page } from 'puppeteer-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultScreenshotPath, findAllDetailFrames, findWebviewFrame, parseFlags } from '../../src/bin/cards-dev.js';

// Wrap os.tmpdir with a spy that defaults to the real implementation, so the
// "real temp dir" test below still observes the genuine platform temp dir while
// the non-hardcoding test can force a sentinel return. A plain value assertion
// cannot catch a hardcoded '/tmp/screenshot.png' regression on Linux (where
// os.tmpdir() IS '/tmp'); overriding the return is the only platform-agnostic
// way to prove the path is derived from os.tmpdir() at call time.
vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>();
  return { ...actual, tmpdir: vi.fn(actual.tmpdir) };
});

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

  it('derives the path from os.tmpdir() rather than a hardcoded constant', () => {
    // Force a non-default temp dir; a hardcoded '/tmp/screenshot.png' would
    // ignore this and fail. This catches the regression on every platform,
    // including Linux where os.tmpdir() coincidentally equals '/tmp'.
    vi.mocked(tmpdir).mockReturnValueOnce(join('/sentinel', 'custom-tmp'));
    expect(defaultScreenshotPath()).toBe(join('/sentinel', 'custom-tmp', 'screenshot.png'));
  });
});

// ─── Frame/Page fixtures ───────────────────────────────────────────────────
//
// `findAllDetailFrames`/`findWebviewFrame` call `childFrame.evaluate(fn)` with
// a zero-argument callback that reads the browser-global `window`/`document`.
// Rather than re-implement that logic in the fixture, `evaluate` here just
// invokes the real callback against `vi.stubGlobal`-provided fakes — this
// exercises the exact merge/fallback logic in the source, not a re-description
// of it.

/**
 * A `document.querySelector` stub: maps selector -> element (or `true` for
 * "exists, no attributes needed"); an absent key resolves to `null`.
 *
 * @param selectors - Map of CSS selector to the element that should match it.
 * @returns A fake `document`-like object exposing `querySelector`.
 */
function makeDocument(selectors: Record<string, { getAttribute(name: string): string | null } | true>) {
  return {
    querySelector: (selector: string) => {
      const entry = selectors[selector];
      if (entry === undefined) return null;
      if (entry === true) return {};
      return entry;
    }
  };
}

function metaTag(content: string): { getAttribute(name: string): string | null } {
  return { getAttribute: (name: string) => (name === 'content' ? content : null) };
}

function makeChildFrame(): Frame {
  return {
    evaluate: (fn: () => unknown) => Promise.resolve(fn())
  } as unknown as Frame;
}

function makePageWithChildFrame(childFrame: Frame): Page[] {
  const topFrame = {
    url: () => 'https://vscode-webview.example/abc',
    childFrames: () => [childFrame]
  };
  return [{ frames: () => [topFrame] } as unknown as Page];
}

describe('findAllDetailFrames', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('falls back to the cards-panel-card-id meta tag when __INIT_DATA__ is absent (frozen panel)', async () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('document', makeDocument({ 'meta[name="cards-panel-card-id"]': metaTag('main-777') }));

    const childFrame = makeChildFrame();
    const results = await findAllDetailFrames(makePageWithChildFrame(childFrame));

    expect(results).toEqual([{ frame: childFrame, cardId: 'main-777' }]);
  });

  it('prefers __INIT_DATA__.cardId over the meta tag when both are present (healthy panel)', async () => {
    vi.stubGlobal('window', { __INIT_DATA__: { cardId: 'main-1' } });
    vi.stubGlobal('document', makeDocument({ 'meta[name="cards-panel-card-id"]': metaTag('main-2') }));

    const childFrame = makeChildFrame();
    const results = await findAllDetailFrames(makePageWithChildFrame(childFrame));

    expect(results).toEqual([{ frame: childFrame, cardId: 'main-1' }]);
  });

  it('returns no match when neither __INIT_DATA__ nor the meta tag is present', async () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('document', makeDocument({}));

    const childFrame = makeChildFrame();
    const results = await findAllDetailFrames(makePageWithChildFrame(childFrame));

    expect(results).toEqual([]);
  });
});

describe('findWebviewFrame — list target', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('matches a frozen sidebar via the cards-webview-kind meta tag (vscode-textfield absent)', async () => {
    vi.stubGlobal('document', makeDocument({ 'meta[name="cards-webview-kind"]': metaTag('list') }));

    const childFrame = makeChildFrame();
    const frame = await findWebviewFrame(makePageWithChildFrame(childFrame), 'list');

    expect(frame).toBe(childFrame);
  });

  it('falls back to the vscode-textfield predicate for a pre-feature build with no meta tag', async () => {
    vi.stubGlobal('document', makeDocument({ 'vscode-textfield': true }));

    const childFrame = makeChildFrame();
    const frame = await findWebviewFrame(makePageWithChildFrame(childFrame), 'list');

    expect(frame).toBe(childFrame);
  });

  it('throws when neither signal is present and the frame is genuinely not a list', async () => {
    vi.stubGlobal('document', makeDocument({ '[data-timeline-kind]': true }));

    await expect(findWebviewFrame(makePageWithChildFrame(makeChildFrame()), 'list')).rejects.toThrow(
      'Could not find Cards list webview frame'
    );
  });
});
