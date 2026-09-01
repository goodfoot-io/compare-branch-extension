/**
 * Tests for the Antigravity PreInvocation handler contract: registration,
 * card-context readiness, watcher setup, and the ready/failure marker
 * invariants.
 *
 * @summary Tests for the Antigravity PreInvocation handler
 */

import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AntigravityHandlerDeps } from '../../../src/antigravity/internal/deps.js';
import { type HandlerFailure, handlePreInvocation } from '../../../src/antigravity/internal/handlers.js';
import { defaultAntigravityIo } from '../../../src/antigravity/internal/io.js';
import { markerExists, markerPath, readMarker } from '../../../src/antigravity/internal/markers.js';
import { dispatchAntigravityHook } from '../../../src/antigravity/internal/transport.js';
import {
  CONVERSATION_ID,
  type DepsRecorders,
  makeCardRepo,
  makeDeps,
  makeInvocationInput,
  makeTempDir,
  removeTempDir,
  SESSION_ID,
  withoutEnv
} from '../helpers.js';

let root: string;
let restoreEnv: () => void;

beforeEach(() => {
  root = makeTempDir('pre-invocation');
  makeCardRepo(root);
  restoreEnv = withoutEnv('CARD_ID', 'ANTIGRAVITY_SESSION_ID');
  process.env['CARD_ID'] = 'main-453';
  process.env['ANTIGRAVITY_SESSION_ID'] = SESSION_ID;
});

afterEach(() => {
  restoreEnv();
  removeTempDir(root);
});

function cardsHome(): string {
  return join(root, 'cards-home');
}

function readyMarker(): string {
  return markerPath(cardsHome(), SESSION_ID, CONVERSATION_ID, 'ready');
}

function failureMarker(): string {
  return markerPath(cardsHome(), SESSION_ID, CONVERSATION_ID, 'failure');
}

/**
 * Runs the handler through the real transport dispatch, as the host would.
 *
 * @param overrides - Deps overrides merged last.
 * @param input - Raw stdin value (defaults to the valid invocation fixture).
 * @returns The result (when no failure), the caught failure, and the recorders.
 */
async function run(
  overrides: Partial<AntigravityHandlerDeps> = {},
  input: unknown = makeInvocationInput(root)
): Promise<{ result: { output?: unknown } | null; failure: HandlerFailure | null; recorders: DepsRecorders }> {
  const { deps, recorders } = makeDeps(root, overrides);
  let result: { output?: unknown } | null = null;
  let failure: HandlerFailure | null = null;
  try {
    result = await dispatchAntigravityHook(input, handlePreInvocation, deps);
  } catch (error) {
    failure = error as HandlerFailure;
  }
  return { result, failure, recorders };
}

describe('PreInvocation success contract', () => {
  it('returns no message and writes the conversation-scoped ready marker', async () => {
    const { result } = await run();
    expect(result?.output).toEqual({});
    expect(markerExists(defaultAntigravityIo, readyMarker())).toBe(true);
  });

  it('records the durable session ↔ conversation mapping in the ready marker', async () => {
    const { failure } = await run();
    expect(failure).toBeNull();
    expect(JSON.parse(readMarker(defaultAntigravityIo, readyMarker()))).toEqual({
      conversationId: CONVERSATION_ID,
      sessionId: SESSION_ID,
      transcriptPath: join(root, 'transcripts', `${CONVERSATION_ID}.jsonl`),
      modelName: 'gemini-3-pro'
    });
  });

  it('registers the session → worktree/transcript mapping', async () => {
    const { failure, recorders } = await run();
    expect(failure).toBeNull();
    expect(recorders.registrations).toEqual([
      {
        sessionId: SESSION_ID,
        worktreeDir: join(root, 'workspace'),
        transcriptPath: join(root, 'transcripts', `${CONVERSATION_ID}.jsonl`)
      }
    ]);
  });

  it('runs the reconciliation sweep', async () => {
    const { failure, recorders } = await run();
    expect(failure).toBeNull();
    expect(recorders.reconciliations).toBe(1);
  });

  it('spawns the watcher with an antigravity manifest keyed by the agent PID', async () => {
    const { failure, recorders } = await run();
    expect(failure).toBeNull();
    expect(recorders.watcherSpawns).toHaveLength(1);
    expect(recorders.watcherSpawns[0]?.manifest).toMatchObject({
      version: 1,
      sessionId: SESSION_ID,
      cardId: 'main-453',
      runtime: 'antigravity',
      streamType: 'antigravity-conversation',
      monitorPid: 4242,
      cardRepoPath: join(root, 'cards', 'main-453'),
      sources: [{ pattern: `${CONVERSATION_ID}.jsonl`, role: 'main', mode: 'jsonl-tail' }]
    });
    expect(recorders.watcherSpawns[0]?.manifest.watchRoot).toBe(join(root, 'transcripts'));
    expect(recorders.watcherSpawns[0]?.extensionPath).toBe(join(root, 'extension'));
  });

  it('writes no failure marker on the success path', async () => {
    const { failure } = await run();
    expect(failure).toBeNull();
    expect(markerExists(defaultAntigravityIo, failureMarker())).toBe(false);
  });
});

describe('PreInvocation failure contract', () => {
  it('stays inert without a Cards action environment', async () => {
    delete process.env['CARD_ID'];
    const { result } = await run();
    expect(result?.output).toEqual({});
    expect(markerExists(defaultAntigravityIo, readyMarker())).toBe(false);
  });

  it('fails closed on invalid input and scopes the failure marker to the conversation', async () => {
    const input = makeInvocationInput(root) as unknown as Record<string, unknown>;
    delete input['transcriptPath'];
    const { failure } = await run({}, input);
    expect(failure?.stage).toBe('input');
    const payload = JSON.parse(readMarker(defaultAntigravityIo, failureMarker())) as { stage: string; reason: string };
    expect(payload.stage).toBe('input');
    expect(payload.reason).toContain('transcriptPath');
    expect(markerExists(defaultAntigravityIo, readyMarker())).toBe(false);
  });

  it('scopes the failure marker to the unknown-conversation placeholder when no conversation id arrived', async () => {
    const input = makeInvocationInput(root) as unknown as Record<string, unknown>;
    delete input['conversationId'];
    const { failure } = await run({}, input);
    expect(failure?.stage).toBe('input');
    expect(markerExists(defaultAntigravityIo, markerPath(cardsHome(), SESSION_ID, null, 'failure'))).toBe(true);
  });

  it('fails closed when the launcher session identity is missing', async () => {
    const { failure } = await run({ resolveSessionId: () => null });
    expect(failure?.stage).toBe('session-identity');
    expect(markerExists(defaultAntigravityIo, markerPath(cardsHome(), null, CONVERSATION_ID, 'failure'))).toBe(true);
    expect(markerExists(defaultAntigravityIo, readyMarker())).toBe(false);
  });

  it('fails closed when the action environment is broken', async () => {
    const { failure } = await run({ loadActionInput: () => null });
    expect(failure?.stage).toBe('action-env');
    expect(markerExists(defaultAntigravityIo, readyMarker())).toBe(false);
  });

  it('fails closed when the card repository is inaccessible', async () => {
    rmSync(join(root, 'cards', 'main-453', 'CARD.meta.json'));
    const { failure } = await run();
    expect(failure?.stage).toBe('card-context');
    expect(markerExists(defaultAntigravityIo, readyMarker())).toBe(false);
  });

  it('fails closed when the agent PID cannot be identified', async () => {
    const { failure } = await run({ findMonitorPid: async () => null });
    expect(failure?.stage).toBe('watcher-setup');
    expect(markerExists(defaultAntigravityIo, readyMarker())).toBe(false);
  });

  it('fails closed when the manifest builder rejects the transcript path', async () => {
    const input = makeInvocationInput(root, { transcriptPath: `${join(root, 'transcripts')}/` });
    const { failure } = await run({}, input);
    expect(failure?.stage).toBe('watcher-setup');
    expect(markerExists(defaultAntigravityIo, readyMarker())).toBe(false);
  });

  it('fails closed when the watcher spawn does not happen', async () => {
    const { failure } = await run({ spawnWatcher: () => false });
    expect(failure?.stage).toBe('watcher-setup');
    expect(markerExists(defaultAntigravityIo, readyMarker())).toBe(false);
  });

  it('fails closed when session registration fails', async () => {
    const { failure } = await run({
      registerSession: async () => {
        throw new Error('disk full');
      }
    });
    expect(failure?.stage).toBe('session-registration');
    expect(markerExists(defaultAntigravityIo, readyMarker())).toBe(false);
  });

  it('fails closed when the ready marker cannot be written', async () => {
    const failingIo = {
      ...defaultAntigravityIo,
      writeTextFileSync: (path: string, data: string) => {
        if (path.endsWith('.ready')) {
          throw new Error('read-only filesystem');
        }
        defaultAntigravityIo.writeTextFileSync(path, data);
      }
    };
    const { failure } = await run({ io: failingIo });
    expect(failure?.stage).toBe('ready-marker');
    expect(markerExists(defaultAntigravityIo, readyMarker())).toBe(false);
    expect(markerExists(defaultAntigravityIo, failureMarker())).toBe(true);
  });
});
