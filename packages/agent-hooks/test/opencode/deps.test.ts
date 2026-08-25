/**
 * Tests for the OpenCode dependency seam additions: the session-history sort
 * and the SDK-backed default loader built over the captured plugin client.
 *
 * @summary Tests for loadSessionHistory defaults in internal/deps
 */

import type { Plugin } from '@opencode-ai/plugin';
import { describe, expect, it } from 'vitest';
import {
  createSdkSessionHistory,
  type OpencodeSessionHistoryEntry,
  sortSessionHistory
} from '../../src/opencode/internal/deps.js';

function entry(id: string, created: number | undefined): OpencodeSessionHistoryEntry {
  return {
    info: { id, ...(created === undefined ? {} : { time: { created } }) },
    parts: []
  };
}

describe('sortSessionHistory', () => {
  it('orders entries ascending by info.time.created', () => {
    const sorted = sortSessionHistory([entry('late', 300), entry('early', 100), entry('mid', 200)]);
    expect(sorted.map((e) => e.info['id'])).toEqual(['early', 'mid', 'late']);
  });

  it('keeps ties in input order (stable tiebreak)', () => {
    const a = entry('a', 100);
    const b = entry('b', 100);
    const c = entry('c', 100);
    const sorted = sortSessionHistory([c, a, b]);
    expect(sorted.map((e) => e.info['id'])).toEqual(['c', 'a', 'b']);
  });

  it('treats missing or malformed time.created as zero', () => {
    const sorted = sortSessionHistory([
      entry('has-time', 50),
      entry('no-time', undefined),
      { info: { id: 'bad-time', time: { created: 'soon' } }, parts: [] }
    ]);
    // Zero-valued entries keep input order among themselves.
    expect(sorted.map((e) => e.info['id'])).toEqual(['no-time', 'bad-time', 'has-time']);
  });
});

describe('createSdkSessionHistory', () => {
  function makeSdkClient(
    calls: Array<string>,
    respond: (sessionId: string) => { data?: Array<OpencodeSessionHistoryEntry>; error?: unknown }
  ): Parameters<Plugin>[0]['client'] {
    return {
      session: {
        messages: async (options: { path: { id: string } }) => {
          calls.push(options.path.id);
          return respond(options.path.id);
        }
      }
    } as unknown as Parameters<Plugin>[0]['client'];
  }

  it('requests messages by path id and returns the sorted payload', async () => {
    const calls: Array<string> = [];
    const client = makeSdkClient(calls, () => ({
      data: [entry('late', 300), entry('early', 100)]
    }));
    const loader = createSdkSessionHistory(client);

    const history = await loader('ses-x');

    expect(calls).toEqual(['ses-x']);
    expect(history.map((e) => e.info['id'])).toEqual(['early', 'late']);
  });

  it('throws with the error detail when the response carries no data', async () => {
    const calls: Array<string> = [];
    const client = makeSdkClient(calls, () => ({ data: undefined, error: { status: 500 } }));
    const loader = createSdkSessionHistory(client);

    await expect(loader('ses-x')).rejects.toThrow('500');
    expect(calls).toEqual(['ses-x']);
  });
});
