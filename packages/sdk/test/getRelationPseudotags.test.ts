/**
 * Tests for getRelationPseudotags utility.
 *
 * @summary Verifies relation pseudotag deduplication and directional flags
 */

import { describe, expect, it } from 'vitest';
import type { CardRelation } from '../src/protocol/index.js';
import { getRelationPseudotags } from '../src/searchUtils.js';

describe('getRelationPseudotags', () => {
  it('deduplicates the same type and card ID appearing in both directions', () => {
    const outgoing: CardRelation[] = [{ type: 'related', cardId: 'main-2' }];
    const incoming: CardRelation[] = [{ type: 'related', cardId: 'main-2' }];

    const pseudotags = getRelationPseudotags(outgoing, incoming);

    expect(pseudotags).toHaveLength(1);
    expect(pseudotags[0]).toMatchObject({ type: 'related', cardId: 'main-2', outgoing: true, incoming: true });
  });

  it('produces two separate pseudotags for related and depends_on to the same card', () => {
    const outgoing: CardRelation[] = [
      { type: 'related', cardId: 'main-2' },
      { type: 'depends_on', cardId: 'main-2' }
    ];

    const pseudotags = getRelationPseudotags(outgoing, []);

    expect(pseudotags).toHaveLength(2);
    expect(pseudotags).toContainEqual(expect.objectContaining({ type: 'related', cardId: 'main-2' }));
    expect(pseudotags).toContainEqual(expect.objectContaining({ type: 'depends_on', cardId: 'main-2' }));
  });

  it('keeps outgoing depends_on and incoming depends_on from different cards distinct', () => {
    const outgoing: CardRelation[] = [{ type: 'depends_on', cardId: 'main-2' }];
    const incoming: CardRelation[] = [{ type: 'depends_on', cardId: 'main-3' }];

    const pseudotags = getRelationPseudotags(outgoing, incoming);

    expect(pseudotags).toHaveLength(2);
    expect(pseudotags).toContainEqual(
      expect.objectContaining({ type: 'depends_on', cardId: 'main-2', outgoing: true, incoming: false })
    );
    expect(pseudotags).toContainEqual(
      expect.objectContaining({ type: 'depends_on', cardId: 'main-3', outgoing: false, incoming: true })
    );
  });
});
