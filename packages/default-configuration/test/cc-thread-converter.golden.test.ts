/**
 * Golden-fixture tests for `toThreadMessages` — byte-identical output gates
 * for structural refactors of the claude-code-session converter.
 *
 * Each `test/fixtures/cc-thread-converter/*.jsonl` transcript runs through
 * the production pipeline (`parseLines` → `mergeConsecutiveMessages` →
 * `toThreadMessages`) and is compared byte-for-byte against a committed
 * `.goldens/<fixture>.golden.json`, so any change to ids, part ordering,
 * metadata, or derived session fields fails loudly. The converter is the
 * hot, high-churn transcript path and this suite pins its observable
 * behavior while per-message-subtype handlers are extracted behind a
 * dispatch table (see card main-500). Rendered markup is exercised by the
 * `StreamThread` render assertions in cc-thread-converter.test.ts; raw HTML
 * goldens are deliberately not used here (message timestamps fall back to
 * wall-clock time, which is not reproducible).
 *
 * Regenerating goldens deliberately has no dedicated script: they change
 * only when converter output legitimately changes, and that must surface as
 * an intentional golden-file diff in review, not a silent re-capture.
 *
 * @summary Byte-identical golden fixtures for the SessionMsg[] → ThreadMessageLike[] converter
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mergeConsecutiveMessages, parseLines } from '../src/streams/claude-code-session/www/lib/parse-session.js';
import { toThreadMessages } from '../src/streams/claude-code-session/www/lib/to-thread-messages.js';

const FIXTURE_DIR = join(new URL('.', import.meta.url).pathname, 'fixtures/cc-thread-converter');
const GOLDEN_DIR = join(FIXTURE_DIR, '.goldens');

const FIXTURES = readdirSync(FIXTURE_DIR).filter((name) => name.endsWith('.jsonl'));

describe('toThreadMessages — golden fixtures (byte-identical output)', () => {
  it.each(FIXTURES)('%s converts to output identical to its committed golden', (name) => {
    const lines = readFileSync(join(FIXTURE_DIR, name), 'utf-8').split('\n');
    const converted = toThreadMessages(mergeConsecutiveMessages(parseLines(lines)));

    const goldenPath = join(GOLDEN_DIR, `${name}.golden.json`);
    const golden = readFileSync(goldenPath, 'utf-8');
    expect(`${JSON.stringify(converted, null, 2)}\n`).toBe(golden);
  });
});
