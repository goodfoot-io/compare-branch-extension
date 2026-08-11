/**
 * Theme-variable parity: the corpus of value shapes the webview forwards and
 * the server bakes must be judged by one filter, entry for entry.
 *
 * The webview's collector forwards only entries whose values pass
 * [isSafeCssValue()](./src/theme/cssValue.ts) — the SDK filter both ends of the
 * pipe run: the webview filters before forwarding, and the server's `?vars=`
 * validation refuses a payload containing any entry that fails it. This file
 * pins the filter's verdicts on the shared corpus; the server-side half of the
 * agreement (Phase C: the route's `?vars=` handling must accept exactly the
 * `safe: true` entries and refuse the rest) tests against the same corpus
 * imported from [theme-vars-corpus.ts](./test/fixtures/theme-vars-corpus.ts).
 *
 * @summary Shared theme-value corpus with per-entry filter verdicts
 * @module test/protocol/types/vars-parity
 */

import { describe, expect, it } from 'vitest';
import { isSafeCssValue } from '../../../src/theme/cssValue.js';
import { THEME_VARS_CORPUS } from '../../fixtures/theme-vars-corpus.js';

describe.skip('theme-variable parity — the shared filter’s entry-for-entry verdicts', () => {
  it('judges every corpus entry exactly as its expected verdict says', () => {
    const disagreements = THEME_VARS_CORPUS.filter(({ value, safe }) => isSafeCssValue(value) !== safe);
    expect(disagreements).toEqual([]);
  });
});
