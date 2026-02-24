/**
 * Tests for shared context-building utilities.
 *
 * @summary Tests for lib/context
 */

import { TestGitWorkspace } from '@cards/test-utils';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildAdditionalContext, buildCardRepoListing, buildRuntimeContext, CardRepoAccessError } from '../../src/lib/context.js';

let testRepo: TestGitWorkspace;
let repoPath: string;

beforeAll(async () => {
  testRepo = new TestGitWorkspace();
  repoPath = await testRepo.create();
});

afterAll(() => {
  testRepo.destroy();
});

describe('buildAdditionalContext', () => {
  const makeActionInput = (overrides?: Record<string, unknown>) => ({
    cardId: 'card-123',
    actionName: 'Launch',
    environment: 'default',
    executionMode: 'interactive' as const,
    apiBaseUrl: 'http://localhost:3000',
    apiAccessToken: 'test-token',
    workspacePath: '/workspace',
    cardRepoPath: repoPath,
    switchToInteractiveData: undefined,
    codingAgent: undefined,
    ...overrides
  });

  afterEach(() => {
    delete process.env['WORKSPACE_BRANCH'];
    delete process.env['BASE_BRANCH'];
  });

  it('returns runtime context followed by card repo listing', () => {
    const result = buildAdditionalContext(makeActionInput());

    // Should contain runtime context
    expect(result).toContain('Launch action');
    expect(result).toContain('interactive mode');
    expect(result).toContain(repoPath);

    // Should contain card repo listing
    expect(result).toContain('The card `card-123` repository at');
    expect(result).toContain('contains the following files:');

    // Should be separated by blank line
    const runtimeContext = buildRuntimeContext(makeActionInput());
    const cardRepoListing = buildCardRepoListing('card-123', repoPath);
    expect(result).toBe(`${runtimeContext}\n\n${cardRepoListing}`);
  });

  it('throws CardRepoAccessError when repo is inaccessible', () => {
    const input = makeActionInput({ cardRepoPath: '/tmp/does-not-exist-xyz-999' });

    expect(() => buildAdditionalContext(input)).toThrow(CardRepoAccessError);
  });

  it('includes branch info when env vars are set', () => {
    process.env['WORKSPACE_BRANCH'] = 'cards/card-123/1';
    process.env['BASE_BRANCH'] = 'main';

    const result = buildAdditionalContext(makeActionInput());

    expect(result).toContain('`cards/card-123/1`');
    expect(result).toContain('`main`');
  });
});
