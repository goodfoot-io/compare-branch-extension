// src/bin/card.ts
import { spawnSync } from "node:child_process";
import { associatePidWithCard, findClaudePid, removePidEntry } from "@cards/claude-code-sessions";
import { CardsClient } from "@cards/sdk/client";
import { discoverApiInfo } from "@cards/sdk/client/discovery";
var SHA_PATTERN = /^[0-9a-f]{40}$/i;
var HELP = `Usage: card.mjs [options] <command>

Read, create, start, and stop card sessions via the Cards API.
Locates the server through ~/.cards/cards-api.json, executes the command,
and prints the resulting Card JSON to stdout.

Options:
  -h, --help       Show this help text

Commands:
  <card-id>        Fetch a card by its identifier
  create           Create a card from JSON on stdin
  start <card-id>  Associate this Claude session with a card
  stop             Disassociate this Claude session from its card

Get:
  Pass a card identifier as the sole argument. The full Card object is
  returned, including repositoryPath for filesystem access.

  Examples:
    card.mjs feat-42
    card.mjs main-0001

Create:
  Pipe a JSON object to stdin. Required fields: title (non-empty string),
  description (string). Optional fields: tags (string[]), environment
  (string), gates ({ planRequired?: boolean, reviewRequired?: boolean }).

  Examples:
    card.mjs create <<'EOF'
    { "title": "Fix auth", "description": "Token refresh fails" }
    EOF

Start:
  Associates the current Claude process with a card in the session registry.
  Optionally registers the workspace branch and flushes any pending commits.

  Examples:
    card.mjs start main-0001

Stop:
  Removes the current Claude process from the session registry.

  Examples:
    card.mjs stop

Exit codes:
  0  Success
  1  Error (missing arguments, invalid input, discovery failure, API error)`;
async function connectClient() {
  const info = await discoverApiInfo();
  if (!info) {
    throw new Error("API discovery failed \u2014 is the cards server running?");
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
function parseCardCreateInput(raw) {
  if (!raw.trim()) {
    throw new Error("expected JSON on stdin");
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("invalid JSON on stdin");
  }
  if (typeof parsed["title"] !== "string" || !parsed["title"].trim()) {
    throw new Error('missing required field "title"');
  }
  if (typeof parsed["description"] !== "string") {
    throw new Error('missing required field "description"');
  }
  const data = {
    title: parsed["title"],
    description: parsed["description"]
  };
  if (Array.isArray(parsed["tags"])) {
    data.tags = parsed["tags"];
  }
  if (typeof parsed["environment"] === "string") {
    data.environment = parsed["environment"];
  }
  if (parsed["gates"] != null && typeof parsed["gates"] === "object") {
    const g = parsed["gates"];
    data.gates = {
      ...typeof g["planRequired"] === "boolean" ? { planRequired: g["planRequired"] } : {},
      ...typeof g["reviewRequired"] === "boolean" ? { reviewRequired: g["reviewRequired"] } : {}
    };
  }
  return data;
}
async function createCard() {
  const raw = await readStdin();
  const data = parseCardCreateInput(raw);
  const client = await connectClient();
  const card = await client.createCard(data);
  console.log(JSON.stringify(card, null, 2));
}
function getCurrentBranch() {
  const result = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    encoding: "utf-8",
    timeout: 3e3
  });
  if (result.error || result.status !== 0) return null;
  const branch = result.stdout.trim();
  return branch && branch !== "HEAD" ? branch : null;
}
function isAncestorOfHead(sha) {
  if (!SHA_PATTERN.test(sha)) return false;
  const result = spawnSync("git", ["merge-base", "--is-ancestor", sha, "HEAD"], {
    stdio: "ignore",
    timeout: 3e3
  });
  return !result.error && result.status === 0;
}
async function startCard(cardId) {
  const pid = findClaudePid();
  if (!pid) {
    throw new Error("could not find Claude ancestor PID");
  }
  const pendingCommits = await associatePidWithCard(pid, cardId);
  console.error(`card start: PID ${pid} associated with card ${cardId}`);
  const client = await connectClient();
  const branch = getCurrentBranch();
  if (branch) {
    const branchData = { name: branch };
    try {
      await client.addBranch(cardId, branchData);
      console.error(`card start: registered branch ${branch}`);
    } catch (error) {
      console.error(
        `card start: branch registration failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  let flushedCount = 0;
  for (const sha of pendingCommits) {
    if (!isAncestorOfHead(sha)) continue;
    try {
      await client.addCommit(cardId, sha);
      flushedCount++;
    } catch (error) {
      console.error(
        `card start: failed to flush commit ${sha}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  if (pendingCommits.length > 0) {
    console.error(`card start: flushed ${flushedCount}/${pendingCommits.length} pending commit(s)`);
  }
  return { pid, cardId, branch, flushedCommits: flushedCount };
}
async function stopCard() {
  const pid = findClaudePid();
  if (!pid) {
    throw new Error("could not find Claude ancestor PID");
  }
  const entry = await removePidEntry(pid);
  if (entry) {
    console.error(`card stop: PID ${pid} disassociated from card ${entry.cardId ?? "(none)"}`);
  } else {
    console.error(`card stop: PID ${pid} had no active association`);
  }
  return { pid };
}
if (process.argv[1]?.endsWith("card.mjs")) {
  const command = process.argv[2];
  if (!command || command === "-h" || command === "--help") {
    console.log(HELP);
    process.exit(command ? 0 : 1);
  }
  let run;
  switch (command) {
    case "create":
      run = createCard();
      break;
    case "start": {
      const cardId = process.argv[3];
      if (!cardId) {
        console.error("card start: missing card ID argument");
        process.exit(1);
      }
      run = startCard(cardId).then((result) => {
        console.log(JSON.stringify({ success: true, ...result }));
      });
      break;
    }
    case "stop":
      run = stopCard().then((result) => {
        console.log(JSON.stringify({ success: true, ...result }));
      });
      break;
    default:
      run = getCard(command);
      break;
  }
  run.catch((error) => {
    console.error("card:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
export {
  connectClient,
  createCard,
  getCard,
  getCurrentBranch,
  isAncestorOfHead,
  parseCardCreateInput,
  startCard,
  stopCard
};
