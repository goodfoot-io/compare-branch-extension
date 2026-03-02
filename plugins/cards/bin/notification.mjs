// ../sdk/src/client/api-discovery.ts
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
async function discoverApiInfo(logger) {
  if (process.env["API_TEST_MODE"] === "1") {
    logger?.debug("API_TEST_MODE: Using mock API info");
    return {
      host: "localhost",
      port: 9999,
      pid: 99999,
      accessToken: "test-token",
      startedAt: "2024-01-01T00:00:00Z"
    };
  }
  const configPath = join(homedir(), ".cards", "cards-api.json");
  try {
    const content = await readFile(configPath, "utf-8");
    const config = JSON.parse(content);
    if (typeof config["host"] !== "string" || typeof config["port"] !== "number" || typeof config["accessToken"] !== "string" || typeof config["pid"] !== "number" || typeof config["startedAt"] !== "string") {
      logger?.debug("API info discovery failed", { error: "Config missing required fields" });
      return null;
    }
    return {
      host: config["host"],
      port: config["port"],
      accessToken: config["accessToken"],
      pid: config["pid"],
      startedAt: config["startedAt"],
      sessionBaseline: config["sessionBaseline"]
    };
  } catch (error) {
    logger?.debug("API info discovery failed", { error: String(error) });
    return null;
  }
}

// src/bin/notification.ts
var VALID_TYPES = ["error", "warning", "info"];
var HELP = `Usage: notification.mjs [options] --type <type> --title <title> --message <message> --source <source>

Send a notification to the Cards VSCode extension.
Locates the server through ~/.cards/cards-api.json and sends a notification
that surfaces as a VSCode message.

Options:
  -h, --help           Show this help text

Required:
  --type <type>        Severity: error, warning, or info
  --title <title>      Short title shown in the notification
  --message <message>  Detailed notification body
  --source <source>    Identifier for grouping/filtering (e.g. agent name)

Examples:
  notification.mjs --type info --title "Build complete" --message "All tests pass" --source my-agent
  notification.mjs --type warning --title "Slow query" --message "Query took 5s" --source db-monitor
  notification.mjs --type error --title "Deploy failed" --message "Exit code 1" --source ci

Exit codes:
  0  Success
  1  Error (missing arguments, discovery failure, API error)`;
function parseFlags(args) {
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const value = args[++i];
    if (value === void 0) {
      throw new Error(`flag ${arg} requires a value`);
    }
    flags[key] = value;
  }
  return flags;
}
async function sendNotification(args) {
  const flags = parseFlags(args);
  const type = flags["type"];
  const title = flags["title"];
  const message = flags["message"];
  const source = flags["source"];
  if (!type) throw new Error("missing required flag --type");
  if (!title) throw new Error("missing required flag --title");
  if (!message) throw new Error("missing required flag --message");
  if (!source) throw new Error("missing required flag --source");
  if (!VALID_TYPES.includes(type)) {
    throw new Error(`invalid --type "${type}" \u2014 must be one of: ${VALID_TYPES.join(", ")}`);
  }
  const info = await discoverApiInfo();
  if (!info) {
    throw new Error("API discovery failed \u2014 is the cards server running?");
  }
  const url = `http://${info.host}:${info.port}/api/notifications`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${info.accessToken}`
    },
    body: JSON.stringify({ type, title, message, source })
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`server responded with ${response.status}: ${body}`);
  }
  const result = await response.json();
  console.log(JSON.stringify(result));
}
if (process.argv[1]?.endsWith("notification.mjs")) {
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    console.log(HELP);
    process.exit(0);
  }
  sendNotification(args).catch((error) => {
    console.error("notification:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
export {
  sendNotification
};
