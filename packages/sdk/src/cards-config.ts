/**
 * Shared Cards configuration directory helpers.
 *
 * Keeps global Cards path resolution consistent across packages that need to
 * read or stage user-scoped Cards-managed assets.
 *
 * @summary Shared Cards configuration directory helpers
 * @module
 */

import { homedir } from 'node:os';
import * as path from 'node:path';

/** Name of the Cards configuration directory. */
export const CARDS_DIR_NAME = '.cards';

/**
 * Resolves the Cards global configuration directory using the standard fallback chain.
 *
 * Resolution order:
 * 1. `$CARDS_HOME`
 * 2. `$XDG_DATA_HOME/.cards`
 * 3. `$XDG_CONFIG_HOME/.cards`
 * 4. `~/.cards`
 *
 * @returns Absolute path to the Cards global configuration directory.
 */
export function resolveGlobalCardsConfigDir(): string {
  const cardsHome = process.env['CARDS_HOME'];
  if (cardsHome) {
    return cardsHome;
  }

  const xdgDataHome = process.env['XDG_DATA_HOME'];
  if (xdgDataHome) {
    return path.join(xdgDataHome, CARDS_DIR_NAME);
  }

  const xdgConfigHome = process.env['XDG_CONFIG_HOME'];
  if (xdgConfigHome) {
    return path.join(xdgConfigHome, CARDS_DIR_NAME);
  }

  return path.join(homedir(), CARDS_DIR_NAME);
}
