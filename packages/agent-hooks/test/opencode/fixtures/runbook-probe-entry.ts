/**
 * Probe entry for the A3 runbook-resolver layout witness.
 *
 * esbuild-bundled into `<payload>/plugin/probe.mjs` inside both install-layout
 * fixture trees; when executed, `import.meta.url` is the probe bundle's own
 * location, exactly like a shipped handler bundle. Results land in the file
 * named by `CARDS_RUNBOOK_PROBE_OUT`.
 *
 * @summary A3 witness probe — resolver executed from an installed-layout bundle
 */

import { writeFileSync } from 'node:fs';
import { resolveRunbookFrom } from '../../../src/opencode/internal/deps.js';

const out = process.env['CARDS_RUNBOOK_PROBE_OUT'];
if (!out) {
  throw new Error('CARDS_RUNBOOK_PROBE_OUT is required');
}

writeFileSync(
  out,
  JSON.stringify({
    merge: resolveRunbookFrom(import.meta.url, 'merge.md'),
    shutdown: resolveRunbookFrom(import.meta.url, 'shutdown.md')
  })
);
