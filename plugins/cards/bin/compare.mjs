// src/bin/compare.ts
import { CardsClient } from "@cards/sdk/client";
import { discoverApiInfo } from "@cards/sdk/client/discovery";
var HELP = `Usage: compare.mjs [options] <command>

Manage the Cards API compare state.
Locates the server through ~/.cards/cards-api.json, executes the command,
and prints the resulting state to stdout.

Options:
  -h, --help       Show this help text

Commands:
  set              Set comparison from JSON on stdin
  get              Get current comparison state
  clear            Clear the active comparison

Set:
  Pipe a JSON object to stdin. Three request shapes are supported:
    Branch range:       { "baseRef": "main", "compareRef": "feature/x" }
    Dynamic worktree:   { "baseRef": "main", "repositoryPath": "/path/to/repo" }
    Fixed attribution:  { "compareRef": "feature/x", "attributionShas": ["abc..."] }

  Examples:
    compare.mjs set <<'EOF'
    { "baseRef": "main", "compareRef": "cards/main-1/1" }
    EOF

Get:
  Prints the current compare state as JSON, or a message if none is active.

  Examples:
    compare.mjs get

Clear:
  Removes the active comparison.

  Examples:
    compare.mjs clear

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
function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString()));
    process.stdin.on("error", reject);
  });
}
function parseCompareInput(raw) {
  if (!raw.trim()) {
    throw new Error("expected JSON on stdin");
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("invalid JSON on stdin");
  }
}
async function setCompare() {
  const raw = await readStdin();
  const request = parseCompareInput(raw);
  const client = await connectClient();
  const state = await client.setCompare(request);
  console.log(JSON.stringify(state, null, 2));
}
async function getCompare() {
  const client = await connectClient();
  const state = await client.getCompare();
  if (!state) {
    console.log("No active comparison");
    return null;
  }
  console.log(JSON.stringify(state, null, 2));
  return state;
}
async function clearCompare() {
  const client = await connectClient();
  await client.clearCompare();
  console.log(JSON.stringify({ success: true }));
}
if (process.argv[1]?.endsWith("compare.mjs")) {
  const command = process.argv[2];
  if (!command || command === "-h" || command === "--help") {
    console.log(HELP);
    process.exit(command ? 0 : 1);
  }
  let run;
  switch (command) {
    case "set":
      run = setCompare();
      break;
    case "get":
      run = getCompare().then(() => {
      });
      break;
    case "clear":
      run = clearCompare();
      break;
    default:
      console.error(`compare: unknown command "${command}"`);
      process.exit(1);
  }
  run.catch((error) => {
    console.error("compare:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
export {
  clearCompare,
  connectClient,
  getCompare,
  parseCompareInput,
  setCompare
};
