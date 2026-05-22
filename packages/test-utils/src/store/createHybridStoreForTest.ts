/**
 * Test factory for constructing a {@link HybridStore} with the scaffold fixture
 * directory injected automatically.
 *
 * Why: `HybridStoreOptions.scaffoldDir` is a required field (it enforces the
 * "every card repo is provisioned" invariant at compile time). Test suites
 * never have a packaged marketplace path on hand, so this factory injects
 * `resolveScaffoldDirFromSource()` — which resolves the SDK `src/scaffold`
 * fixtures directly from TS source under vitest — relieving every test site
 * from supplying `scaffoldDir` by hand.
 *
 * @summary HybridStore test constructor that injects the scaffold fixture dir
 * @module test-utils/store/createHybridStoreForTest
 */

import type { HybridStoreDeps } from '@cards/hybrid-store';
import { HybridStore, type HybridStoreOptions } from '@cards/hybrid-store';
import { resolveScaffoldDirFromSource } from '@cards/sdk';

/**
 * Constructs a {@link HybridStore} for tests, defaulting `scaffoldDir` to the
 * SDK source-resolved scaffold fixture directory.
 *
 * @param base - All {@link HybridStoreOptions} except `scaffoldDir`, which is
 *   injected from {@link resolveScaffoldDirFromSource}.
 * @param deps - Optional injectable dependencies forwarded to the constructor.
 * @returns A configured {@link HybridStore} instance.
 */
export function createHybridStoreForTest(
  base: Omit<HybridStoreOptions, 'scaffoldDir'>,
  deps?: HybridStoreDeps
): HybridStore {
  return new HybridStore({ ...base, scaffoldDir: resolveScaffoldDirFromSource() }, deps);
}
