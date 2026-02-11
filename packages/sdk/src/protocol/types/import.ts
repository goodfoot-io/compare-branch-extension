/**
 * Import/export schemas for Cards V2 cards.
 *
 * This module defines the JSON shape used when cards are moved in or out of
 * the system. It intentionally keeps defaults optional so older exports can be
 * imported without losing fidelity.
 *
 * @module types/import
 */

import type { CardGates } from './card.js';
import type { CardStatus } from './status.js';

/**
 * Serialized card format used for JSON import and export.
 *
 * Required fields match the minimum viable card, while optional fields allow
 * full-fidelity round-trips when available.
 */
export interface SerializedCard {
  /** Card title shown in lists and headings. */
  title: string;
  /** Optional markdown description body. */
  description?: string;
  /** Current lifecycle state of the card. */
  status: CardStatus;
  /** Optional tags for filtering and grouping. */
  tags?: string[];
  /** Optional gate configuration; partial updates are allowed. */
  gates?: Partial<CardGates>;
  /** Optional display order within its status column. */
  order?: number;
}
