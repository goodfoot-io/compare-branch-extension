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
import {
  ALLOW_MULTIPLE_WINDOWS_ENV,
  assertSingleWindow,
  defaultScreenshotPath,
  findAllDetailFrames,
  findWebviewFrame,
  parseFlags,
  workbenchPages
} from '../../src/bin/cards-dev.js';

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
  return makePageWithChildFrames([childFrame]);
}

/**
 * A childFrame whose `evaluate` swaps in its own `document` stub for the
 * duration of the call, rather than relying on a single `vi.stubGlobal`
 * shared across every frame. This lets a fixture model multiple frames with
 * *different* DOM content open at once — e.g. a competing marked panel
 * alongside the sidebar — which a single global `document` stub cannot.
 *
 * @param selectors - Map of CSS selector to the element that should match it for this frame only.
 * @returns A fake `Frame` whose `evaluate` sees only this frame's document.
 */
function makeChildFrameWithDocument(
  selectors: Record<string, { getAttribute(name: string): string | null } | true>
): Frame {
  return {
    evaluate: (fn: () => unknown) => {
      const previous = (globalThis as { document?: unknown }).document;
      (globalThis as { document?: unknown }).document = makeDocument(selectors);
      try {
        return Promise.resolve(fn());
      } finally {
        (globalThis as { document?: unknown }).document = previous;
      }
    }
  } as unknown as Frame;
}

function makePageWithChildFrames(childFrames: Frame[]): Page[] {
  const topFrame = {
    url: () => 'https://vscode-webview.example/abc',
    childFrames: () => childFrames
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

  // Every `<html>` emitter now carries a `cards-webview-kind` marker with its
  // own distinct value (see `webviewKindMetaTag`), so a frame that isn't the
  // sidebar identifies itself as such and the legacy `vscode-textfield`
  // predicate becomes unreachable for it. Before that, a Create Card or
  // Editor panel — which also renders an unconditional `vscode-textfield`
  // with no `[data-timeline-kind]` — could satisfy the legacy predicate and
  // be mistaken for the sidebar list, depending purely on frame iteration
  // order. These fixtures model a second Cards panel genuinely being open
  // alongside the sidebar, which the single-frame fixtures above cannot.
  it('selects the sidebar over a competing marked create-card frame, regardless of iteration order', async () => {
    const createCardFrame = makeChildFrameWithDocument({
      'meta[name="cards-webview-kind"]': metaTag('create-card'),
      'vscode-textfield': true
    });
    const listFrame = makeChildFrameWithDocument({
      'meta[name="cards-webview-kind"]': metaTag('list')
    });

    // Worst-case order: the competing frame is iterated first.
    const frame = await findWebviewFrame(makePageWithChildFrames([createCardFrame, listFrame]), 'list');
    expect(frame).toBe(listFrame);

    // And the reverse order, to show the result doesn't depend on which
    // frame the loop happens to see first.
    const frameReversed = await findWebviewFrame(makePageWithChildFrames([listFrame, createCardFrame]), 'list');
    expect(frameReversed).toBe(listFrame);
  });

  it('falls back to the legacy predicate only for a pre-this-card unmarked frame, even with a marked competing frame present', async () => {
    const createCardFrame = makeChildFrameWithDocument({
      'meta[name="cards-webview-kind"]': metaTag('create-card'),
      'vscode-textfield': true
    });
    // Pre-this-card build: no cards-webview-kind meta tag at all, so it can
    // only be identified via the legacy vscode-textfield predicate.
    const legacySidebarFrame = makeChildFrameWithDocument({ 'vscode-textfield': true });

    const frame = await findWebviewFrame(makePageWithChildFrames([createCardFrame, legacySidebarFrame]), 'list');

    expect(frame).toBe(legacySidebarFrame);
  });
});

// ─── Window attribution ──────────────────────────────────────────────────────

/**
 * A page fixture that reports only its URL — all `assertSingleWindow` reads.
 *
 * @param url - URL the fake page reports.
 * @returns A structural stand-in for a Puppeteer page.
 */
function pageAt(url: string): { url(): string } {
  return { url: () => url };
}

/** The two-window state a worktree-per-card workflow produces routinely. */
const TWO_WINDOWS = [
  pageAt('vscode-file://vscode-app/.../workbench.html'),
  pageAt('vscode-webview://a1/index.html'),
  pageAt('vscode-file://vscode-app/.../workbench.html'),
  pageAt('vscode-webview://b2/index.html')
];

describe('assertSingleWindow', () => {
  it('allows a single window with its webview pages', () => {
    expect(() =>
      assertSingleWindow(
        [pageAt('vscode-file://vscode-app/.../workbench.html'), pageAt('vscode-webview://a1/index.html')],
        {}
      )
    ).not.toThrow();
  });

  it('refuses when two windows are visible on the debug port', () => {
    // The defect this closes: with two windows, this CLI (addressed by debug
    // port) can read window B's panel while cards-extension (addressed by
    // workspace path) reads window A's host, and the difference gets reported
    // as a stale panel whose remedy — reload the panel — regenerates it from
    // window B's host and leaves both compared values exactly where they were.
    expect(() => assertSingleWindow(TWO_WINDOWS, {})).toThrow(/MULTIPLE VS CODE WINDOWS — 2 windows/);
  });

  it('names the waiver in the refusal so the message is actionable', () => {
    expect(() => assertSingleWindow(TWO_WINDOWS, {})).toThrow(/CARDS_DEV_ALLOW_MULTIPLE_WINDOWS=1/);
  });

  it('proceeds under an explicit waiver', () => {
    expect(() => assertSingleWindow(TWO_WINDOWS, { [ALLOW_MULTIPLE_WINDOWS_ENV]: '1' })).not.toThrow();
  });

  it('treats any value other than 1 as no waiver at all', () => {
    // A fail-open waiver is worse than none: `=0` or `=false` reads as "off" to
    // whoever exported it, and would silently restore the unattributable read.
    for (const value of ['0', 'false', '', 'yes']) {
      expect(() => assertSingleWindow(TWO_WINDOWS, { [ALLOW_MULTIPLE_WINDOWS_ENV]: value })).toThrow(
        /MULTIPLE VS CODE WINDOWS/
      );
    }
  });

  it('does not count webview pages as windows', () => {
    expect(() =>
      assertSingleWindow(
        [
          pageAt('vscode-file://vscode-app/.../workbench.html'),
          pageAt('vscode-webview://a1/index.html'),
          pageAt('vscode-webview://a2/index.html'),
          pageAt('vscode-webview://a3/index.html')
        ],
        {}
      )
    ).not.toThrow();
  });

  it('refuses a third window too, reporting the real count', () => {
    expect(() =>
      assertSingleWindow([...TWO_WINDOWS, pageAt('vscode-file://vscode-app/.../workbench.html')], {})
    ).toThrow(/MULTIPLE VS CODE WINDOWS — 3 windows/);
  });
});

describe('workbenchPages', () => {
  it('selects exactly the workbench documents', () => {
    expect(workbenchPages(TWO_WINDOWS)).toHaveLength(2);
  });
});
