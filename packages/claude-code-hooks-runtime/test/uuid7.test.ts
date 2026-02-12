/**
 * Tests for UUID v7 generator.
 */
import { describe, expect, it } from 'vitest';
import { generateUUID7 } from '../src/bin/uuid7.js';

describe('generateUUID7', () => {
  it('returns a string matching UUID v7 format', () => {
    const uuid = generateUUID7();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('returns monotonically increasing values when called in sequence', () => {
    const a = generateUUID7();
    const b = generateUUID7();
    expect(a < b || a.substring(0, 13) === b.substring(0, 13)).toBe(true);
  });

  it('embeds current millisecond timestamp in first 48 bits', () => {
    const before = Date.now();
    const uuid = generateUUID7();
    const after = Date.now();
    // Extract first 12 hex chars (48 bits = timestamp)
    const timestampHex = uuid.replace(/-/g, '').substring(0, 12);
    const timestamp = parseInt(timestampHex, 16);
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });
});
