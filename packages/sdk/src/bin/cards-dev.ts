/**
 * CLI binary for Puppeteer-based webview interaction with the Cards VS Code extension.
 *
 * Connects to the running Electron/VS Code process via CDP (port 19222), navigates
 * nested iframe layers to reach the Cards webviews, performs one action, outputs
 * JSON to stdout, then disconnects. Never closes the browser — only disconnects.
 *
 * Subcommands: screenshot, list-elements, click, type, scroll, read, wait
 *
 * @summary Puppeteer-based Cards webview CLI — CDP connection, iframe traversal, and 7 subcommands
 * @module cards-dev
 */

import { tmpdir } from 'node:os';
import { join } from 'node:path';
import puppeteer, { type Browser, type Frame, type Page } from 'puppeteer-core';

// ─── Types ───────────────────────────────────────────────────────────────────

/** The two webview targets supported by all subcommands. */
export type WebviewTarget = 'detail' | 'list';

/** Result of {@link connectBrowser}. */
export interface BrowserConnection {
  browser: Browser;
  pages: Page[];
}

/** A single interactive element description returned by {@link listElements}. */
export interface ElementInfo {
  tag: string;
  text: string;
  title: string;
  ariaLabel: string;
  type: string;
  disabled: boolean;
  checked: boolean;
}

/** Result of {@link screenshot}. */
export interface ScreenshotResult {
  path: string;
}

/** Result of {@link click}. */
export interface ClickResult {
  clicked: true;
  element: { tag: string; text: string };
}

/** Result of {@link typeInto}. */
export interface TypeResult {
  typed: true;
  element: { tag: string; label: string };
}

/** Result of {@link scroll}. */
export interface ScrollResult {
  scrolled: true;
  scrollTop: number;
}

/** An element entry returned by {@link read}. */
export interface ReadElement {
  text: string;
  tag: string;
  attributes: Record<string, string>;
}

/** Result of {@link read} when a selector is provided. */
export interface ReadSelectorResult {
  elements: ReadElement[];
}

/** Result of {@link read} when no selector is provided (body text). */
export interface ReadBodyResult {
  text: string;
}

/** Result of {@link wait}. */
export interface WaitResult {
  found: boolean;
  elapsed: number;
}

// ─── Help Text ───────────────────────────────────────────────────────────────

const HELP = `cards-dev — Puppeteer-based webview interaction for Cards VS Code extension

USAGE
  cards-dev <subcommand> [flags]

SUBCOMMANDS
  screenshot             Take a screenshot
    --target detail|list   Webview body screenshot (omit for full window)
    --card <id>            Card to target (e.g. main:42); opens it if not already open
    --output <path>        Output path (default: <os-temp-dir>/screenshot.png)

  list-elements          List interactive elements in a webview
    --target detail|list   (required)
    --card <id>            Card to target when --target detail

  click                  Click an element by label
    --target detail|list   (required)
    --label <text>         Match by textContent, title, or aria-label (required)
    --index <N>            Disambiguate when multiple elements match
    --card <id>            Card to target when --target detail

  type                   Type text into an input
    --target detail|list   (required)
    --label <text>         Find input by label/placeholder/aria-label (required)
    --text <value>         Text to type (required)
    --append               Type without clearing existing value
    --card <id>            Card to target when --target detail

  scroll                 Scroll a webview
    --target detail|list   (required)
    --direction up|down    (required)
    --selector <css>       Specific container to scroll
    --amount <N>           Pixels to scroll (default: viewport height)
    --card <id>            Card to target when --target detail

  read                   Read text content from a webview
    --target detail|list   (required)
    --selector <css>       Read from matching elements (omit for body text)
    --attribute <name>     Read attribute instead of text content
    --card <id>            Card to target when --target detail

  wait                   Wait for an element to appear or disappear
    --target detail|list   (required)
    --selector <css>       CSS selector to wait for
    --text <text>          Text to wait for (alternative to --selector)
    --absent               Wait for disappearance instead of appearance
    --timeout <N>          Milliseconds to wait (default: 5000)
    --card <id>            Card to target when --target detail

PREREQUISITES
  VS Code must be running with --remote-debugging-port=19222
  CDP endpoint: http://127.0.0.1:19222
`;

// ─── Boolean flags (no value argument) ───────────────────────────────────────

const BOOLEAN_FLAGS = new Set(['append', 'absent']);

// ─── Flag Parsing ─────────────────────────────────────────────────────────────

/**
 * Parses `--key value` pairs (and boolean flags) from a string array into a record.
 *
 * Accumulates multiple values for the same key (e.g. `--tag bug --tag feature`
 * produces `{ tag: ['bug', 'feature'] }`). Boolean flags (like `--append`,
 * `--absent`) are stored as `['true']` without consuming the next argument.
 * Stops at the first positional argument (one that doesn't start with `--`).
 *
 * @param args - CLI argument array to parse.
 * @returns Parsed key-to-values pairs with the leading `--` stripped from keys.
 * @throws Error when a non-boolean flag is missing its value.
 */
export function parseFlags(args: string[]): Record<string, string[]> {
  const flags: Record<string, string[]> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (!arg.startsWith('--')) break;
    const key = arg.slice(2);
    if (BOOLEAN_FLAGS.has(key)) {
      const existing = flags[key];
      if (existing) {
        existing.push('true');
      } else {
        flags[key] = ['true'];
      }
      continue;
    }
    const value = args[++i];
    if (value === undefined) {
      throw new Error(`flag ${arg} requires a value`);
    }
    const existing = flags[key];
    if (existing) {
      existing.push(value);
    } else {
      flags[key] = [value];
    }
  }
  return flags;
}

// ─── CDP Connection Helpers ───────────────────────────────────────────────────

/**
 * Connects to the running VS Code Electron process via CDP and finds the
 * workbench page.
 *
 * Fetches the WebSocket debugger URL from `http://127.0.0.1:19222/json/version`,
 * connects Puppeteer with `defaultViewport: null` (required for Electron), and
 * returns the browser and the workbench page. Throws on any failure — there is
 * no silent fallback.
 *
 * @returns A {@link BrowserConnection} with the connected browser and workbench page.
 * @throws Error if CDP is not reachable or the workbench page is not found.
 */
export async function connectBrowser(): Promise<BrowserConnection> {
  let webSocketDebuggerUrl: string;
  try {
    const response = await fetch('http://127.0.0.1:19222/json/version');
    if (!response.ok) {
      throw new Error(`CDP responded with status ${response.status}`);
    }
    const json = (await response.json()) as { webSocketDebuggerUrl?: string };
    if (!json.webSocketDebuggerUrl) {
      throw new Error('CDP /json/version did not return webSocketDebuggerUrl');
    }
    webSocketDebuggerUrl = json.webSocketDebuggerUrl;
  } catch (error) {
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      throw new Error(
        'Cannot connect to CDP at http://127.0.0.1:19222 — ensure VS Code is running with --remote-debugging-port=19222'
      );
    }
    throw error;
  }

  const browser = await puppeteer.connect({
    browserWSEndpoint: webSocketDebuggerUrl,
    defaultViewport: null
  });

  const pages = await browser.pages();
  if (pages.length === 0) {
    await browser.disconnect();
    throw new Error('No browser pages found — is VS Code running?');
  }

  return { browser, pages };
}

/**
 * Disconnects from the browser without closing VS Code.
 *
 * Always call `disconnect()` rather than `close()` — `close()` would terminate
 * the VS Code process.
 *
 * @param browser - The connected Puppeteer browser instance.
 */
export async function disconnectBrowser(browser: Browser): Promise<void> {
  await browser.disconnect();
}

/**
 * Finds all open Cards detail webview frames and reads the card ID from each.
 *
 * A detail frame is identified by `window.__INIT_DATA__.cardId` — the host
 * injects this into the webview HTML before React boots. Any webview child
 * frame that carries a non-empty `cardId` in `__INIT_DATA__` is a detail panel.
 *
 * @param pages - All browser pages to search across.
 * @returns Array of `{ frame, cardId }` pairs for every open detail panel.
 */
export async function findAllDetailFrames(pages: Page[]): Promise<Array<{ frame: Frame; cardId: string }>> {
  const results: Array<{ frame: Frame; cardId: string }> = [];
  for (const p of pages) {
    for (const frame of p.frames()) {
      if (!frame.url().includes('vscode-webview')) continue;
      for (const childFrame of frame.childFrames()) {
        try {
          const cardId = await childFrame.evaluate(() => {
            const init = (window as unknown as { __INIT_DATA__?: { cardId?: string } }).__INIT_DATA__;
            return init?.cardId ?? null;
          });
          if (cardId) results.push({ frame: childFrame, cardId });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          if (/detach|destroy|not found|cross-origin|context was destroyed|execution context/i.test(msg)) {
            continue;
          }
          throw error;
        }
      }
    }
  }
  return results;
}

/**
 * Opens a card in the Cards detail panel by clicking its row in the list webview.
 *
 * Finds the `CardListItem` element whose card-ID span matches `cardId` and
 * clicks it. This triggers `onCardSelect(cardId)` inside the list webview,
 * which calls the `cards.openCard` VS Code command internally — the same path
 * used by normal user interaction. No keyboard automation or external IPC is
 * required.
 *
 * @param pages - All browser pages (used to locate the list webview frame).
 * @param cardId - Card identifier to open (e.g. `'main-108'`).
 * @throws Error if the list webview is not found or the card is not in the list.
 */
export async function openCardViaList(pages: Page[], cardId: string): Promise<void> {
  // Find the list webview frame
  let listFrame: Frame | null = null;
  for (const p of pages) {
    for (const frame of p.frames()) {
      if (!frame.url().includes('vscode-webview')) continue;
      for (const childFrame of frame.childFrames()) {
        try {
          const isList = await childFrame.evaluate(() => {
            const init = (window as unknown as { __INIT_DATA__?: { cardId?: string } }).__INIT_DATA__;
            return !init?.cardId && !!document.querySelector('vscode-textfield');
          });
          if (isList) {
            listFrame = childFrame;
            break;
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          if (/detach|destroy|not found|cross-origin|context was destroyed|execution context/i.test(msg)) {
            continue;
          }
          throw error;
        }
      }
      if (listFrame) break;
    }
    if (listFrame) break;
  }

  if (!listFrame) {
    throw new Error('Cards list webview is not open — cannot auto-open the card');
  }

  const clicked = await listFrame.evaluate((id: string) => {
    for (const item of document.querySelectorAll('.CardListItem')) {
      // The card ID is rendered as a <span> inside the list item
      const spans = item.querySelectorAll('span');
      for (const span of spans) {
        if (span.textContent?.trim() === id) {
          (item as HTMLElement).click();
          return true;
        }
      }
    }
    return false;
  }, cardId);

  if (!clicked) {
    throw new Error(`Card '${cardId}' not found in the Cards list — is the list loaded?`);
  }

  // Allow the detail panel to begin opening
  await new Promise((r) => setTimeout(r, 800));
}

/**
 * Finds the Cards webview iframe matching the given target.
 *
 * VS Code renders webviews on separate Electron pages (not on the workbench
 * page), so this searches frames across **all** pages. Filters for URLs
 * containing `vscode-webview`, then searches child frames using content-based
 * matching:
 *
 * - `list`: child frame with a `vscode-textfield` but no `[data-timeline-kind]`
 * - `detail` without `cardId`: single open detail frame; throws if zero or many
 * - `detail` with `cardId`: frame whose `window.__INIT_DATA__.cardId` matches;
 *   if not found, opens the card via {@link openCardViaCommandPalette} and polls
 *   until it appears (up to 10 seconds), then throws on timeout
 *
 * @param pages - All browser pages to search across.
 * @param target - Which webview to find: `"detail"` or `"list"`.
 * @param cardId - Optional card identifier (e.g. `'main:42'`) for detail targets.
 * @returns The matched inner `Frame`.
 * @throws Error if no matching frame is found or ambiguity cannot be resolved.
 */
export async function findWebviewFrame(pages: Page[], target: WebviewTarget, cardId?: string): Promise<Frame> {
  if (target === 'list') {
    for (const p of pages) {
      for (const frame of p.frames()) {
        if (!frame.url().includes('vscode-webview')) continue;
        for (const childFrame of frame.childFrames()) {
          try {
            const isList = await childFrame.evaluate(
              () => !document.querySelector('[data-timeline-kind]') && !!document.querySelector('vscode-textfield')
            );
            if (isList) return childFrame;
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            if (/detach|destroy|not found|cross-origin|context was destroyed|execution context/i.test(msg)) {
              continue;
            }
            throw error;
          }
        }
      }
    }
    throw new Error('Could not find Cards list webview frame');
  }

  // detail target — collect all open detail frames
  const detailFrames = await findAllDetailFrames(pages);

  if (cardId !== undefined) {
    const match = detailFrames.find((f) => f.cardId === cardId);
    if (match) return match.frame;

    // Card not open yet — open it by clicking in the list webview
    await openCardViaList(pages, cardId);

    // Poll until the frame appears (up to 10 seconds)
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 500));
      const frames = await findAllDetailFrames(pages);
      const found = frames.find((f) => f.cardId === cardId);
      if (found) return found.frame;
    }
    throw new Error(`Card '${cardId}' did not open within 10 seconds`);
  }

  // No cardId specified — require exactly one detail frame
  if (detailFrames.length === 0) {
    throw new Error('No card detail panel is open; open a card or pass --card <id>');
  }
  if (detailFrames.length === 1) {
    return detailFrames[0]!.frame;
  }
  const openIds = detailFrames.map((f) => f.cardId ?? 'unknown').join(', ');
  throw new Error(`Multiple cards are open (${openIds}); specify --card <id>`);
}

// ─── Subcommands ─────────────────────────────────────────────────────────────

/**
 * Resolves the default screenshot output path inside the OS temp directory.
 * Used when `--output` is omitted. Cross-platform: never hardcodes a POSIX path.
 *
 * @returns Absolute path to `screenshot.png` in the OS temp dir.
 */
export function defaultScreenshotPath(): string {
  return join(tmpdir(), 'screenshot.png');
}

/**
 * Takes a screenshot of the full VS Code window or a specific webview body.
 *
 * - No `--target`: full window screenshot using `captureBeyondViewport: false`
 * - `--target detail|list`: body screenshot of the matching Cards webview
 * - `--output <path>`: custom output path (default: `screenshot.png` in the OS temp dir)
 *
 * @param args - CLI arguments after the `screenshot` subcommand.
 * @returns The file path of the saved screenshot.
 */
export async function screenshot(args: string[]): Promise<ScreenshotResult> {
  const flags = parseFlags(args);
  const outputPath = flags['output']?.[0] ?? defaultScreenshotPath();
  const target = flags['target']?.[0];
  const cardId = flags['card']?.[0];

  if (target !== undefined && target !== 'detail' && target !== 'list') {
    throw new Error(`screenshot: --target must be "detail" or "list", got "${target}"`);
  }

  const { browser, pages } = await connectBrowser();
  try {
    if (target) {
      const frame = await findWebviewFrame(pages, target, cardId);
      const body = await frame.$('body');
      if (!body) throw new Error('Could not find body element in webview frame');
      await body.screenshot({ path: outputPath });
    } else if (cardId) {
      // Derive the workbench page from the card's detail frame
      const frame = await findWebviewFrame(pages, 'detail', cardId);
      await frame.page().screenshot({ path: outputPath, captureBeyondViewport: false });
    } else {
      // No target or card — use the first workbench page
      const page = pages.find((p) => p.url().includes('workbench.html'));
      if (!page) throw new Error('Could not find VS Code workbench page');
      await page.screenshot({ path: outputPath, captureBeyondViewport: false });
    }
    return { path: outputPath };
  } finally {
    await disconnectBrowser(browser);
  }
}

/**
 * Lists interactive elements in the specified Cards webview.
 *
 * Queries `button, [role='button'], vscode-button, input, select, textarea,
 * [role='checkbox'], [role='combobox']` and returns metadata for each element.
 *
 * @param args - CLI arguments after the `list-elements` subcommand.
 * @returns An array of {@link ElementInfo} objects.
 */
export async function listElements(args: string[]): Promise<ElementInfo[]> {
  const flags = parseFlags(args);
  const target = flags['target']?.[0];
  const cardId = flags['card']?.[0];
  if (!target || (target !== 'detail' && target !== 'list')) {
    throw new Error('list-elements: --target detail|list is required');
  }

  const { browser, pages } = await connectBrowser();
  try {
    const frame = await findWebviewFrame(pages, target as WebviewTarget, cardId);
    const elements = await frame.evaluate(() => {
      const selector =
        "button, [role='button'], vscode-button, input, select, textarea, [role='checkbox'], [role='combobox']";
      return Array.from(document.querySelectorAll(selector)).map((el) => ({
        tag: el.tagName,
        text: (el.textContent ?? '').trim(),
        title: el.getAttribute('title') ?? '',
        ariaLabel: el.getAttribute('aria-label') ?? '',
        type: el.getAttribute('type') ?? '',
        disabled:
          el.hasAttribute('disabled') ||
          el.getAttribute('aria-disabled') === 'true' ||
          (el as HTMLButtonElement).disabled === true,
        checked: (el as HTMLInputElement).checked === true || el.getAttribute('aria-checked') === 'true'
      }));
    });
    return elements;
  } finally {
    await disconnectBrowser(browser);
  }
}

/**
 * Clicks an element in the specified Cards webview by matching its label.
 *
 * Matches against `textContent`, `title`, or `aria-label`. Uses
 * `scrollIntoView()` then `.click()` inside `frame.evaluate()` because
 * direct Puppeteer `.click()` is unreliable in nested webview frames.
 *
 * @param args - CLI arguments after the `click` subcommand.
 * @returns A {@link ClickResult} with the element that was clicked.
 * @throws Error if no matching element is found.
 */
export async function click(args: string[]): Promise<ClickResult> {
  const flags = parseFlags(args);
  const target = flags['target']?.[0];
  const label = flags['label']?.[0];
  const indexStr = flags['index']?.[0];
  const cardId = flags['card']?.[0];

  if (!target || (target !== 'detail' && target !== 'list')) {
    throw new Error('click: --target detail|list is required');
  }
  if (!label) {
    throw new Error('click: --label is required');
  }

  const index = indexStr !== undefined ? parseInt(indexStr, 10) : 0;
  if (indexStr !== undefined && (Number.isNaN(index) || index < 0)) {
    throw new Error('click: --index must be a non-negative integer');
  }

  const { browser, pages } = await connectBrowser();
  try {
    const frame = await findWebviewFrame(pages, target as WebviewTarget, cardId);
    const result = await frame.evaluate(
      (lbl: string, idx: number) => {
        const selector =
          "button, [role='button'], vscode-button, input, select, textarea, [role='checkbox'], [role='combobox']";
        const candidates = Array.from(document.querySelectorAll(selector)).filter((el) => {
          const text = (el.textContent ?? '').trim();
          const title = el.getAttribute('title') ?? '';
          const ariaLabel = el.getAttribute('aria-label') ?? '';
          return text === lbl || title === lbl || ariaLabel === lbl;
        });
        const el = candidates[idx];
        if (!el) return null;
        el.scrollIntoView({ block: 'center' });
        (el as HTMLElement).click();
        return { tag: el.tagName, text: (el.textContent ?? '').trim() };
      },
      label,
      index
    );
    if (!result) {
      throw new Error(
        `click: no element with label "${label}"${indexStr !== undefined ? ` at index ${index}` : ''} found in ${target} webview`
      );
    }
    return { clicked: true, element: result };
  } finally {
    await disconnectBrowser(browser);
  }
}

/**
 * Types text into an input element found by label in the specified Cards webview.
 *
 * Finds the input by matching label text, placeholder, or aria-label. Clears
 * existing value unless `--append` is specified. Uses `frame.evaluate()` to
 * focus and clear, then `frame.type()` for realistic keystroke simulation.
 *
 * @param args - CLI arguments after the `type` subcommand.
 * @returns A {@link TypeResult} describing the element typed into.
 * @throws Error if no matching input is found.
 */
export async function typeInto(args: string[]): Promise<TypeResult> {
  const flags = parseFlags(args);
  const target = flags['target']?.[0];
  const label = flags['label']?.[0];
  const text = flags['text']?.[0];
  const append = flags['append'] !== undefined;
  const cardId = flags['card']?.[0];

  if (!target || (target !== 'detail' && target !== 'list')) {
    throw new Error('type: --target detail|list is required');
  }
  if (!label) {
    throw new Error('type: --label is required');
  }
  if (text === undefined) {
    throw new Error('type: --text is required');
  }

  const { browser, pages } = await connectBrowser();
  try {
    const frame = await findWebviewFrame(pages, target as WebviewTarget, cardId);

    // Find and focus the input
    const elementInfo = await frame.evaluate(
      (lbl: string, shouldClear: boolean) => {
        const selector = 'input, select, textarea, [contenteditable]';
        const el = Array.from(document.querySelectorAll(selector)).find((e) => {
          const placeholder = e.getAttribute('placeholder') ?? '';
          const ariaLabel = e.getAttribute('aria-label') ?? '';
          // Also check associated label element
          const id = e.id;
          const labelEl = id ? document.querySelector(`label[for="${id}"]`) : null;
          const labelText = labelEl ? (labelEl.textContent ?? '').trim() : '';
          return placeholder === lbl || ariaLabel === lbl || labelText === lbl;
        });
        if (!el) return null;
        el.scrollIntoView({ block: 'center' });
        (el as HTMLElement).focus();
        if (shouldClear && el.tagName !== 'SELECT') {
          if ((el as HTMLElement).isContentEditable) {
            el.textContent = '';
          } else {
            (el as HTMLInputElement).value = '';
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
        return {
          tag: el.tagName,
          label: el.getAttribute('placeholder') ?? el.getAttribute('aria-label') ?? (el.textContent ?? '').trim()
        };
      },
      label,
      !append
    );

    if (!elementInfo) {
      throw new Error(`type: no input with label "${label}" found in ${target} webview`);
    }

    await frame.page().keyboard.type(text);

    return { typed: true, element: { tag: elementInfo.tag, label: elementInfo.label } };
  } finally {
    await disconnectBrowser(browser);
  }
}

/**
 * Scrolls a webview or a specific container within it.
 *
 * Scrolls by the viewport height by default, or by `--amount` pixels. Targets
 * the document body unless `--selector` specifies a container.
 *
 * @param args - CLI arguments after the `scroll` subcommand.
 * @returns A {@link ScrollResult} with the new `scrollTop` position.
 */
export async function scroll(args: string[]): Promise<ScrollResult> {
  const flags = parseFlags(args);
  const target = flags['target']?.[0];
  const direction = flags['direction']?.[0];
  const selector = flags['selector']?.[0];
  const amountStr = flags['amount']?.[0];
  const cardId = flags['card']?.[0];

  if (!target || (target !== 'detail' && target !== 'list')) {
    throw new Error('scroll: --target detail|list is required');
  }
  if (!direction || (direction !== 'up' && direction !== 'down')) {
    throw new Error('scroll: --direction up|down is required');
  }

  const amount = amountStr !== undefined ? parseInt(amountStr, 10) : undefined;
  if (amountStr !== undefined && (Number.isNaN(amount) || (amount as number) <= 0)) {
    throw new Error('scroll: --amount must be a positive integer');
  }

  const { browser, pages } = await connectBrowser();
  try {
    const frame = await findWebviewFrame(pages, target as WebviewTarget, cardId);
    const scrollTop = await frame.evaluate(
      (dir: string, sel: string | null, amt: number | null) => {
        const el: Element | null = sel ? document.querySelector(sel) : (document.scrollingElement ?? document.body);
        if (!el) throw new Error(`scroll: selector "${sel}" not found`);
        const scrollAmount = amt ?? window.innerHeight;
        el.scrollBy({ top: dir === 'down' ? scrollAmount : -scrollAmount, behavior: 'instant' });
        return (el as HTMLElement).scrollTop;
      },
      direction,
      selector ?? null,
      amount ?? null
    );
    return { scrolled: true, scrollTop };
  } finally {
    await disconnectBrowser(browser);
  }
}

/**
 * Reads text content or attribute values from the specified Cards webview.
 *
 * - No `--selector`: returns `{ text }` with the full body text content
 * - `--selector <css>`: returns `{ elements: [...] }` for each matched element
 * - `--attribute <name>`: reads that attribute instead of text content
 *
 * @param args - CLI arguments after the `read` subcommand.
 * @returns A {@link ReadBodyResult} or {@link ReadSelectorResult}.
 */
export async function read(args: string[]): Promise<ReadBodyResult | ReadSelectorResult> {
  const flags = parseFlags(args);
  const target = flags['target']?.[0];
  const selector = flags['selector']?.[0];
  const attribute = flags['attribute']?.[0];
  const cardId = flags['card']?.[0];

  if (!target || (target !== 'detail' && target !== 'list')) {
    throw new Error('read: --target detail|list is required');
  }

  const { browser, pages } = await connectBrowser();
  try {
    const frame = await findWebviewFrame(pages, target as WebviewTarget, cardId);

    if (!selector) {
      const text = await frame.evaluate(() => (document.body.textContent ?? '').trim());
      return { text };
    }

    const elements = await frame.evaluate(
      (sel: string, attr: string | null) =>
        Array.from(document.querySelectorAll(sel)).map((el) => {
          const attributes: Record<string, string> = {};
          for (const { name, value } of Array.from(el.attributes)) {
            attributes[name] = value;
          }
          return {
            text: attr ? (el.getAttribute(attr) ?? '') : (el.textContent ?? '').trim(),
            tag: el.tagName,
            attributes
          };
        }),
      selector,
      attribute ?? null
    );

    return { elements };
  } finally {
    await disconnectBrowser(browser);
  }
}

/**
 * Waits for an element or text to appear (or disappear) in the specified webview.
 *
 * Uses polling to check for the condition every 100ms. Throws on timeout — no
 * silent failure.
 *
 * @param args - CLI arguments after the `wait` subcommand.
 * @returns A {@link WaitResult} with `found` status and elapsed time in ms.
 * @throws Error on timeout.
 */
export async function wait(args: string[]): Promise<WaitResult> {
  const flags = parseFlags(args);
  const target = flags['target']?.[0];
  const selector = flags['selector']?.[0];
  const text = flags['text']?.[0];
  const absent = flags['absent'] !== undefined;
  const timeoutStr = flags['timeout']?.[0];
  const cardId = flags['card']?.[0];

  if (!target || (target !== 'detail' && target !== 'list')) {
    throw new Error('wait: --target detail|list is required');
  }
  if (!selector && !text) {
    throw new Error('wait: --selector or --text is required');
  }

  const timeout = timeoutStr !== undefined ? parseInt(timeoutStr, 10) : 5000;
  if (Number.isNaN(timeout) || timeout <= 0) {
    throw new Error('wait: --timeout must be a positive integer');
  }

  const { browser, pages } = await connectBrowser();
  try {
    const frame = await findWebviewFrame(pages, target as WebviewTarget, cardId);
    const start = Date.now();

    await frame.waitForFunction(
      (sel: string | null, txt: string | null, shouldBeAbsent: boolean) => {
        let found: boolean;
        if (sel) {
          found = !!document.querySelector(sel);
        } else {
          found = !!(document.body.textContent ?? '').includes(txt!);
        }
        return shouldBeAbsent ? !found : found;
      },
      { timeout, polling: 100 },
      selector ?? null,
      text ?? null,
      absent
    );

    const elapsed = Date.now() - start;
    return { found: !absent, elapsed };
  } finally {
    await disconnectBrowser(browser);
  }
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

if (process.argv[1]?.endsWith('cards-dev.mjs')) {
  const command = process.argv[2];

  if (!command || command === '-h' || command === '--help') {
    console.log(HELP);
    process.exit(command ? 0 : 1);
  }

  let run: Promise<unknown>;
  switch (command) {
    case 'screenshot':
      run = screenshot(process.argv.slice(3)).then((result) => {
        console.log(JSON.stringify(result));
      });
      break;
    case 'list-elements':
      run = listElements(process.argv.slice(3)).then((result) => {
        console.log(JSON.stringify(result, null, 2));
      });
      break;
    case 'click':
      run = click(process.argv.slice(3)).then((result) => {
        console.log(JSON.stringify(result));
      });
      break;
    case 'type':
      run = typeInto(process.argv.slice(3)).then((result) => {
        console.log(JSON.stringify(result));
      });
      break;
    case 'scroll':
      run = scroll(process.argv.slice(3)).then((result) => {
        console.log(JSON.stringify(result));
      });
      break;
    case 'read':
      run = read(process.argv.slice(3)).then((result) => {
        console.log(JSON.stringify(result, null, 2));
      });
      break;
    case 'wait':
      run = wait(process.argv.slice(3)).then((result) => {
        console.log(JSON.stringify(result));
      });
      break;
    default: {
      console.error(`cards-dev: unknown command "${command}"`);
      process.exit(1);
    }
  }

  run.catch((error: unknown) => {
    console.error('cards-dev:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
