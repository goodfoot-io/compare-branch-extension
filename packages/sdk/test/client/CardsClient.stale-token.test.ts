import { afterEach, describe, expect, it, vi } from 'vitest';
import { CardsClient } from '../../src/client/cardsClient.js';

/**
 * Reproduction test for stale access token bug (main-241).
 *
 * CardsClient stores its access token as a private readonly field with no
 * public setter or update method. After construction, there is no way to
 * refresh the token. When the server restarts and issues a new token, the
 * client continues sending the original (now-invalid) token in every request.
 *
 * These tests MUST FAIL against the current (unfixed) code because the
 * required `updateAccessToken()` method does not exist.
 *
 * @summary Reproduction: CardsClient has no credential refresh path
 */

describe('CardsClient — stale access token (main-241)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should allow updating the access token after construction', () => {
    const client = new CardsClient({
      baseUrl: 'http://localhost:3000',
      accessToken: 'token-A'
    });

    // The fix should expose a method to update the access token.
    // This assertion fails because no such method exists on CardsClient.
    expect(typeof (client as unknown as Record<string, unknown>)['updateAccessToken']).toBe('function');
  });

  it('should use the updated token in subsequent request headers', async () => {
    const client = new CardsClient({
      baseUrl: 'http://localhost:3000',
      accessToken: 'token-A'
    });

    const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => []
    } as Response);

    // First request — should use token-A
    await client.listCards();
    const firstCall = mockFetch.mock.calls[0]!;
    const firstHeaders = firstCall[1]?.headers as Record<string, string>;
    expect(firstHeaders['Authorization']).toBe('Bearer token-A');

    // Simulate server restart: a new token is issued.
    // Attempt to update the client's token to token-B.
    // This line will throw or be a no-op because the method doesn't exist.
    const updateFn = (client as unknown as Record<string, unknown>)['updateAccessToken'];
    if (typeof updateFn === 'function') {
      (updateFn as (token: string) => void).call(client, 'token-B');
    }

    // Second request — should use token-B after the update
    await client.listCards();
    const secondCall = mockFetch.mock.calls[1]!;
    const secondHeaders = secondCall[1]?.headers as Record<string, string>;

    // This assertion MUST FAIL: the client still sends token-A because
    // there is no way to update the token after construction.
    expect(secondHeaders['Authorization']).toBe('Bearer token-B');
  });
});
