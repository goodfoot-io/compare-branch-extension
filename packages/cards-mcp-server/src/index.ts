/**
 * CLI entry point for the Cards MCP server.
 *
 * Reads configuration from environment variables, starts the MCP server over
 * stdio, and handles SIGTERM/SIGINT for clean shutdown.
 *
 * @summary CLI entry point for the Cards MCP server
 * @module cards-mcp-server/index
 */

import { readConfig } from './config.js';
import { createServer } from './server.js';

async function main(): Promise<void> {
  const config = readConfig();
  const server = createServer(config);

  process.on('SIGTERM', () => {
    server.stop();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    server.stop();
    process.exit(0);
  });

  await server.start();
}

main().catch((err: unknown) => {
  process.stderr.write(`[cards-mcp-server] Startup failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
