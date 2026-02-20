/**
 * CLI utility that fetches card metadata from the Cards API.
 *
 * Outputs JSON to stdout containing the card's metadata and filesystem path,
 * enabling agents to use filesystem commands to read card contents directly.
 *
 * @example
 * ```bash
 * $NODE ./bin/card.mjs feat-42
 * ```
 *
 * @summary Card metadata CLI utility
 */

import { CardsClient, discoverApiInfo } from '@cards/sdk/client';

/**
 * Fetches a card by ID and prints its metadata as JSON to stdout.
 *
 * Reads the API discovery file to locate the server, then calls
 * `GET /cards/:id`. Exits with code 1 on any failure.
 *
 * @param cardId - The card identifier to look up.
 */
async function main(cardId: string): Promise<void> {
  const info = await discoverApiInfo();
  if (!info) {
    console.error('card: API discovery failed — is the cards server running?');
    process.exit(1);
  }

  const client = new CardsClient({
    baseUrl: `http://${info.host}:${info.port}`,
    accessToken: info.accessToken
  });

  const card = await client.getCard(cardId);
  console.log(JSON.stringify(card, null, 2));
}

if (process.argv[1]?.endsWith('card.mjs')) {
  const cardId = process.argv[2];
  if (!cardId) {
    console.error('usage: card.mjs <card-id>');
    process.exit(1);
  }
  main(cardId).catch((error: unknown) => {
    console.error('card:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
