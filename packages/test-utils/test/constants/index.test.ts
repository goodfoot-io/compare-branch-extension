/**
 * Tests for shared test constants module.
 *
 * Why: the rest of the test suite relies on these values being stable, so any
 * drift should surface immediately.
 *
 *
 * @summary Tests for shared test constants module
 * @module test-utils/test/constants/index.test
 */

import { describe, expect, it } from 'vitest';
import { ADAPTIVE_CARD_STATUSES, CARD_STATUSES, TEST_CONSTANTS } from '../../src/constants/index.js';

describe('TEST_CONSTANTS', () => {
  it('has expected CARD_ID value', () => {
    expect(TEST_CONSTANTS.CARD_ID).toBe('TEST-001');
  });

  it('has expected SESSION_ID value', () => {
    expect(TEST_CONSTANTS.SESSION_ID).toBe('session-test-001');
  });

  it('has expected NONCE value', () => {
    expect(TEST_CONSTANTS.NONCE).toBe('test-nonce-12345');
  });

  it('has expected SOCKET_PATH value', () => {
    expect(TEST_CONSTANTS.SOCKET_PATH).toBe('/tmp/test-ipc.sock');
  });

  it('is a readonly object', () => {
    // TypeScript enforces this at compile time via 'as const'
    // At runtime we verify the object has the expected shape
    expect(Object.keys(TEST_CONSTANTS)).toEqual(['CARD_ID', 'SESSION_ID', 'NONCE', 'SOCKET_PATH']);
  });
});

describe('CARD_STATUSES', () => {
  it('contains all expected status values', () => {
    expect(CARD_STATUSES).toContain('todo');
    expect(CARD_STATUSES).toContain('in_progress');
    expect(CARD_STATUSES).toContain('needs_review');
    expect(CARD_STATUSES).toContain('done');
    expect(CARD_STATUSES).toContain('backlog');
    expect(CARD_STATUSES).toContain('archived');
  });

  it('has exactly 6 statuses', () => {
    expect(CARD_STATUSES).toHaveLength(6);
  });

  it('is a readonly array', () => {
    // TypeScript enforces readonly at compile time
    // Verify it's an array at runtime
    expect(Array.isArray(CARD_STATUSES)).toBe(true);
  });
});

describe('ADAPTIVE_CARD_STATUSES', () => {
  it('contains all expected status values', () => {
    expect(ADAPTIVE_CARD_STATUSES).toContain('active');
    expect(ADAPTIVE_CARD_STATUSES).toContain('completed');
  });

  it('has exactly 2 statuses', () => {
    expect(ADAPTIVE_CARD_STATUSES).toHaveLength(2);
  });

  it('is a readonly array', () => {
    expect(Array.isArray(ADAPTIVE_CARD_STATUSES)).toBe(true);
  });
});
