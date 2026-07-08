/**
 * Tests for the provider-neutral Landmark model and {@link computeBestLandmark}.
 *
 * @summary Unit tests for the Landmark model and preference-chain selection
 */

import { describe, expect, it } from 'vitest';
import type { Landmark } from '../src/streams/lib/landmark.js';
import { computeBestLandmark } from '../src/streams/lib/landmark.js';

// ============================================================================
// Fixtures
// ============================================================================

function landmark(overrides: Partial<Landmark> = {}): Landmark {
  return {
    kind: 'message',
    severity: 'normal',
    label: 'Assistant',
    text: 'Default text',
    sourceRef: '0',
    ...overrides
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('computeBestLandmark', () => {
  it('returns decision over everything else', () => {
    const landmarks: Landmark[] = [
      landmark({ kind: 'message', label: 'Assistant', text: 'msg' }),
      landmark({ kind: 'action', text: 'act' }),
      landmark({ kind: 'decision', text: 'decide' }),
      landmark({ kind: 'failure', text: 'fail' })
    ];
    const best = computeBestLandmark(landmarks);
    expect(best).toBeDefined();
    expect(best!.kind).toBe('decision');
    expect(best!.text).toBe('decide');
  });

  it('returns latest assistant message when no decision', () => {
    const landmarks: Landmark[] = [
      landmark({ kind: 'message', label: 'Assistant', text: 'first msg', sourceRef: '0' }),
      landmark({ kind: 'action', text: 'act' }),
      landmark({ kind: 'message', label: 'Assistant', text: 'last msg', sourceRef: '2' }),
      landmark({ kind: 'message', label: 'User', text: 'user msg', sourceRef: '3' })
    ];
    const best = computeBestLandmark(landmarks);
    expect(best).toBeDefined();
    expect(best!.text).toBe('last msg');
  });

  it('returns latest action when no decision or assistant message', () => {
    const landmarks: Landmark[] = [
      landmark({ kind: 'action', text: 'first act', sourceRef: '0' }),
      landmark({ kind: 'message', label: 'User', text: 'user msg' }),
      landmark({ kind: 'action', text: 'last act', sourceRef: '2' })
    ];
    const best = computeBestLandmark(landmarks);
    expect(best).toBeDefined();
    expect(best!.text).toBe('last act');
  });

  it('returns first failure when no better landmark', () => {
    const landmarks: Landmark[] = [
      landmark({ kind: 'metric', text: 'm1' }),
      landmark({ kind: 'failure', text: 'first fail', sourceRef: '1' }),
      landmark({ kind: 'failure', text: 'second fail', sourceRef: '2' })
    ];
    const best = computeBestLandmark(landmarks);
    expect(best).toBeDefined();
    expect(best!.text).toBe('first fail');
  });

  it('returns last landmark as fallback', () => {
    const landmarks: Landmark[] = [
      landmark({ kind: 'metric', text: 'm1', sourceRef: '0' }),
      landmark({ kind: 'boundary', text: 'b1', sourceRef: '1' }),
      landmark({ kind: 'raw', text: 'last one', sourceRef: '2' })
    ];
    const best = computeBestLandmark(landmarks);
    expect(best).toBeDefined();
    expect(best!.text).toBe('last one');
  });

  it('returns undefined for empty array', () => {
    const best = computeBestLandmark([]);
    expect(best).toBeUndefined();
  });

  it('sourceRef is preserved on the returned landmark', () => {
    const landmarks: Landmark[] = [landmark({ kind: 'decision', text: 'decide', sourceRef: '42' })];
    const best = computeBestLandmark(landmarks);
    expect(best).toBeDefined();
    expect(best!.sourceRef).toBe('42');
  });

  it('text is preserved on the returned landmark', () => {
    const landmarks: Landmark[] = [landmark({ kind: 'decision', text: 'exact text match', sourceRef: '7' })];
    const best = computeBestLandmark(landmarks);
    expect(best).toBeDefined();
    expect(best!.text).toBe('exact text match');
  });
});
