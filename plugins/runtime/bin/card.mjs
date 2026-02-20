// src/bin/card.ts
import { CardsClient, discoverApiInfo } from "@cards/sdk/client";
async function main(cardId) {
  const info = await discoverApiInfo();
  if (!info) {
    console.error("card: API discovery failed \u2014 is the cards server running?");
    process.exit(1);
  }
  const client = new CardsClient({
    baseUrl: `http://${info.host}:${info.port}`,
    accessToken: info.accessToken
  });
  const card = await client.getCard(cardId);
  console.log(JSON.stringify(card, null, 2));
}
if (process.argv[1]?.endsWith("card.mjs")) {
  const cardId = process.argv[2];
  if (!cardId) {
    console.error("usage: card.mjs <card-id>");
    process.exit(1);
  }
  main(cardId).catch((error) => {
    console.error("card:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
