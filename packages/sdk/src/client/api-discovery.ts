/**
 * Cards API discovery utilities.
 *
 * Reads the Cards API discovery file (`<cards-home>/cards-api.json`) to locate
 * the running server and constructs a {@link CardsClient} for use by CLI tools
 * and hook entrypoints.
 *
 * The discovery file is resolved the SAME way the server writes it:
 * `$CARDS_DISCOVERY_PATH` when set (the explicit per-EDH override), otherwise
 * `<resolveGlobalCardsConfigDir()>/cards-api.json` — which honors `$CARDS_HOME`.
 * This symmetry matters for the host QA leg, where OS `HOME` stays real and only
 * the Cards server is isolated via `$CARDS_HOME`: a `homedir()`-based default
 * would escape that isolation and discover the developer's real Cards server
 * instead of the isolated one.
 *
 * All functions return `null` on failure so callers can degrade gracefully.
 * Set `API_TEST_MODE=1` to force deterministic, local values in tests.
 *
 * @summary Cards API discovery utilities
 * @module client/api-discovery
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { resolveGlobalCardsConfigDir } from '../cards-config.js';
import type { CardsApiInfo, SessionBaseline } from '../protocol/index.js';
import { CardsClient } from './cardsClient.js';
import type { CardsClientOptions } from './types/client.js';

/**
 * Minimal logger accepted by discovery functions.
 *
 * Matches the `debug` method of {@link ILogger} so callers can pass any
 * SDK logger or a plain object with a `debug` method.
 */
export interface DiscoveryLogger {
  debug(message: string, context?: Record<string, unknown>): void;
}

/**
 * Reads the Cards API discovery file and returns the full typed payload.
 *
 * Returns `null` when discovery fails (missing file, invalid JSON, or
 * required fields absent).
 *
 * @param logger - Optional logger for debug output.
 * @returns The CardsApiInfo payload, or null if discovery fails.
 */
export async function discoverApiInfo(logger?: DiscoveryLogger): Promise<CardsApiInfo | null> {
  if (process.env['API_TEST_MODE'] === '1') {
    logger?.debug('API_TEST_MODE: Using mock API info');
    return {
      host: 'localhost',
      port: 9999,
      pid: 99999,
      accessToken: 'test-token',
      startedAt: '2024-01-01T00:00:00Z'
    };
  }

  const configPath = process.env['CARDS_DISCOVERY_PATH'] ?? join(resolveGlobalCardsConfigDir(), 'cards-api.json');
  try {
    const content = await readFile(configPath, 'utf-8');
    const config = JSON.parse(content) as Record<string, unknown>;

    if (
      typeof config['host'] !== 'string' ||
      typeof config['port'] !== 'number' ||
      typeof config['accessToken'] !== 'string' ||
      typeof config['pid'] !== 'number' ||
      typeof config['startedAt'] !== 'string'
    ) {
      logger?.debug('API info discovery failed', { error: 'Config missing required fields' });
      return null;
    }

    return {
      host: config['host'],
      port: config['port'],
      accessToken: config['accessToken'],
      pid: config['pid'],
      startedAt: config['startedAt'],
      sessionBaseline: config['sessionBaseline'] as SessionBaseline | undefined
    };
  } catch (error) {
    logger?.debug('API info discovery failed', { error: String(error) });
    return null;
  }
}

/**
 * Creates a {@link CardsClient} from the API discovery file.
 *
 * Reads the discovery file (honoring `$CARDS_DISCOVERY_PATH` / `$CARDS_HOME`,
 * see {@link discoverApiInfo}), extracts host/port/accessToken, and returns a
 * configured client instance. Returns `null` when discovery fails.
 *
 * Accepts an optional `options` object whose fields are merged into the
 * constructed {@link CardsClient} options, overriding the discovered defaults
 * (`baseUrl`/`accessToken`). This lets short-lived callers opt into
 * fail-fast behavior — e.g. `{ retryOnNetworkError: false }` so an unreachable
 * server surfaces a {@link NetworkError} promptly instead of retrying forever.
 *
 * @param logger - Optional logger for debug output.
 * @param options - Optional CardsClient option overrides (additive; merged
 *   over the discovered `baseUrl`/`accessToken`).
 * @returns A configured CardsClient, or null if discovery fails.
 */
export async function createCardsClient(
  logger?: DiscoveryLogger,
  options?: Partial<CardsClientOptions>
): Promise<CardsClient | null> {
  const info = await discoverApiInfo(logger);
  if (!info) return null;

  return new CardsClient({
    baseUrl: `http://${info.host}:${info.port}`,
    accessToken: info.accessToken,
    ...options
  });
}
