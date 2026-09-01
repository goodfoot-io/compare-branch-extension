/**
 * Test factory for constructing a {@link HybridStore} with required fixture
 * inputs injected automatically.
 *
 * Why: `HybridStoreOptions.scaffoldDir` and `HybridStoreOptions.preCommitScript`
 * are required fields. `scaffoldDir` enforces the "every card repo is
 * provisioned" invariant at compile time; `preCommitScript` feeds the compiled
 * card pre-commit bundle that the installed wrapper fails closed on. Test
 * suites never have a packaged marketplace path or a real hook bundle on hand,
 * so this factory injects `resolveScaffoldDirFromSource()` — which resolves the
 * SDK `src/scaffold` fixtures directly from TS source under vitest — and an
 * inert pre-commit fixture, relieving every test site from supplying either by
 * hand.
 *
 * @summary HybridStore test constructor injecting scaffold dir and inert hook
 * @module test-utils/store/createHybridStoreForTest
 */

import type { HybridStoreDeps } from '@cards.management/hybrid-store';
import { HybridStore, type HybridStoreOptions } from '@cards.management/hybrid-store';
import { resolveScaffoldDirFromSource } from '@cards.management/sdk';

/**
 * Inert pre-commit fixture injected when a test does not supply its own
 * `preCommitScript`.
 *
 * `preCommitScript` is required and the installed bash wrapper rejects the
 * commit when the compiled `pre-commit.mjs` beside it is missing or
 * unreadable — so the fixture must be a real file the wrapper can find and
 * execute, not an empty string. This fixture is valid ESM with no effect: the
 * wrapper resolves a Node interpreter, runs it, and it exits 0 without
 * touching the Git index.
 */
const INERT_PRE_COMMIT_SCRIPT = `// @cards.management/test-utils inert pre-commit fixture.
// Executable ESM with no effect: the wrapper runs this bundle and it exits 0.
void 0;
`;

/**
 * Constructs a {@link HybridStore} for tests, defaulting `scaffoldDir` to the
 * SDK source-resolved scaffold fixture directory and `preCommitScript` to the
 * inert no-op fixture.
 *
 * The background reconciliation sweep is run immediately by defaulting
 * `reconciliationDelayMs` to `0`, so suites that await `reconciliationReady`
 * after `initialize()` do not pay the production startup delay. A caller may
 * still override either default (e.g. to assert the deferral behavior or to
 * install a hook that actually validates) by passing it in `base`.
 *
 * @param base - All {@link HybridStoreOptions} except `scaffoldDir`;
 *   `preCommitScript` defaults to the inert fixture when omitted.
 * @param deps - Optional injectable dependencies forwarded to the constructor.
 * @returns A configured {@link HybridStore} instance.
 */
export function createHybridStoreForTest(
  base: Omit<HybridStoreOptions, 'scaffoldDir' | 'preCommitScript'> &
    Partial<Pick<HybridStoreOptions, 'preCommitScript'>>,
  deps?: HybridStoreDeps
): HybridStore {
  return new HybridStore(
    {
      reconciliationDelayMs: 0,
      preCommitScript: INERT_PRE_COMMIT_SCRIPT,
      ...base,
      scaffoldDir: resolveScaffoldDirFromSource()
    },
    deps
  );
}
