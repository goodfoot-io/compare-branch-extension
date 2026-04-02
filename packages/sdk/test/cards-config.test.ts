/**
 * Tests the shared Cards global config directory resolver.
 *
 * @summary Tests Cards config directory resolution
 */

import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CARDS_DIR_NAME, resolveGlobalCardsConfigDir } from '../src/cards-config.js';

const originalCardsHome = process.env['CARDS_HOME'];
const originalXdgDataHome = process.env['XDG_DATA_HOME'];
const originalXdgConfigHome = process.env['XDG_CONFIG_HOME'];

function restoreEnv(): void {
  if (originalCardsHome === undefined) {
    delete process.env['CARDS_HOME'];
  } else {
    process.env['CARDS_HOME'] = originalCardsHome;
  }

  if (originalXdgDataHome === undefined) {
    delete process.env['XDG_DATA_HOME'];
  } else {
    process.env['XDG_DATA_HOME'] = originalXdgDataHome;
  }

  if (originalXdgConfigHome === undefined) {
    delete process.env['XDG_CONFIG_HOME'];
  } else {
    process.env['XDG_CONFIG_HOME'] = originalXdgConfigHome;
  }
}

afterEach(() => {
  restoreEnv();
});

describe('resolveGlobalCardsConfigDir', () => {
  it('uses CARDS_HOME when set', () => {
    process.env['CARDS_HOME'] = '/custom/cards-home';
    delete process.env['XDG_DATA_HOME'];
    delete process.env['XDG_CONFIG_HOME'];

    expect(resolveGlobalCardsConfigDir()).toBe('/custom/cards-home');
  });

  it('falls back to XDG_DATA_HOME/.cards', () => {
    delete process.env['CARDS_HOME'];
    process.env['XDG_DATA_HOME'] = '/custom/xdg-data';
    delete process.env['XDG_CONFIG_HOME'];

    expect(resolveGlobalCardsConfigDir()).toBe(path.join('/custom/xdg-data', CARDS_DIR_NAME));
  });

  it('falls back to XDG_CONFIG_HOME/.cards', () => {
    delete process.env['CARDS_HOME'];
    delete process.env['XDG_DATA_HOME'];
    process.env['XDG_CONFIG_HOME'] = '/custom/xdg-config';

    expect(resolveGlobalCardsConfigDir()).toBe(path.join('/custom/xdg-config', CARDS_DIR_NAME));
  });

  it('falls back to ~/.cards when no env override is set', async () => {
    delete process.env['CARDS_HOME'];
    delete process.env['XDG_DATA_HOME'];
    delete process.env['XDG_CONFIG_HOME'];

    const { homedir } = await import('node:os');
    expect(resolveGlobalCardsConfigDir()).toBe(path.join(homedir(), CARDS_DIR_NAME));
  });

  it('matches extension precedence exactly', () => {
    process.env['CARDS_HOME'] = '/cards-home';
    process.env['XDG_DATA_HOME'] = '/xdg-data';
    process.env['XDG_CONFIG_HOME'] = '/xdg-config';

    expect(resolveGlobalCardsConfigDir()).toBe('/cards-home');

    delete process.env['CARDS_HOME'];
    expect(resolveGlobalCardsConfigDir()).toBe(path.join('/xdg-data', CARDS_DIR_NAME));
  });
});
