// src/bin/card.ts
import { CardsClient, discoverApiInfo } from "@cards/sdk/client";
var HELP = `Usage: card.mjs [options] <command>

Read and create cards via the Cards API.
Locates the server through ~/.cards/cards-api.json, executes the command,
and prints the resulting Card JSON to stdout.

Options:
  -h, --help       Show this help text

Commands:
  <card-id>        Fetch a card by its identifier
  create           Create a card from JSON on stdin

Get:
  Pass a card identifier as the sole argument. The full Card object is
  returned, including repositoryPath for filesystem access.

  Examples:
    card.mjs feat-42
    card.mjs main-0001

Create:
  Pipe a JSON object to stdin. Required fields: title (non-empty string),
  description (string). Optional fields: tags (string[]), environmentName
  (string), gates ({ planRequired?: boolean, reviewRequired?: boolean }).

  Before creating a card, load the skill that matches the request type:
    Bug report       /runtime:card:bug-report
    Documentation    /runtime:card:documentation
    Enhancement      /runtime:card:enhancement
    Investigation    /runtime:card:investigation
    Maintenance      /runtime:card:maintenance
    Operations       /runtime:card:operations

  Examples:
    card.mjs create <<'EOF'
    { "title": "Fix auth", "description": "Token refresh fails" }
    EOF

    echo '{"title":"Spike","description":"Research caching"}' | card.mjs create

Output:
  Both commands print the full Card JSON to stdout with 2-space indent.
  The object includes id, title, status, tags, gates, repositoryPath,
  createdAt, updatedAt, description, and other metadata fields.

Exit codes:
  0  Success
  1  Error (missing arguments, invalid input, discovery failure, API error)`;
async function connectClient() {
  const info = await discoverApiInfo();
  if (!info) {
    console.error("card: API discovery failed \u2014 is the cards server running?");
    process.exit(1);
  }
  return new CardsClient({
    baseUrl: `http://${info.host}:${info.port}`,
    accessToken: info.accessToken
  });
}
async function getCard(cardId) {
  const client = await connectClient();
  const card = await client.getCard(cardId);
  console.log(JSON.stringify(card, null, 2));
}
function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString()));
    process.stdin.on("error", reject);
  });
}
async function createCard() {
  const raw = await readStdin();
  if (!raw.trim()) {
    console.error("card create: expected JSON on stdin");
    process.exit(1);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error("card create: invalid JSON on stdin");
    process.exit(1);
  }
  if (typeof parsed["title"] !== "string" || !parsed["title"].trim()) {
    console.error('card create: missing required field "title"');
    process.exit(1);
  }
  if (typeof parsed["description"] !== "string") {
    console.error('card create: missing required field "description"');
    process.exit(1);
  }
  const data = {
    title: parsed["title"],
    description: parsed["description"]
  };
  if (Array.isArray(parsed["tags"])) {
    data.tags = parsed["tags"];
  }
  if (typeof parsed["environmentName"] === "string") {
    data.environmentName = parsed["environmentName"];
  }
  if (parsed["gates"] != null && typeof parsed["gates"] === "object") {
    const g = parsed["gates"];
    data.gates = {
      ...typeof g["planRequired"] === "boolean" ? { planRequired: g["planRequired"] } : {},
      ...typeof g["reviewRequired"] === "boolean" ? { reviewRequired: g["reviewRequired"] } : {}
    };
  }
  const client = await connectClient();
  const card = await client.createCard(data);
  console.log(JSON.stringify(card, null, 2));
}
if (process.argv[1]?.endsWith("card.mjs")) {
  const command = process.argv[2];
  if (!command || command === "-h" || command === "--help") {
    console.log(HELP);
    process.exit(command ? 0 : 1);
  }
  const run = command === "create" ? createCard() : getCard(command);
  run.catch((error) => {
    console.error("card:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
