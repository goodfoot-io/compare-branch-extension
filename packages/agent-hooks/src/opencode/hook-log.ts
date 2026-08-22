/**
 * Logging sink for OpenCode hook handlers.
 *
 * Three channels, in order of preference:
 *
 * 1. **Server log** — `client.app.log`, visible in OpenCode's own logs.
 * 2. **File anchor** — `<anchorRoot>/.cards/logs/opencode-cards-hooks.log`,
 *    resolved once per process by {@link resolveHookLogFile}; JSONL lines so
 *    the anchor tails like the Claude/Codex anchors.
 * 3. **stderr mirror** — always applied to `warn`/`error` entries, because a
 *    plugin that can only whisper into a server log it may have failed to
 *    reach is a plugin that fails silently.
 *
 * The client arrives at plugin init; before that (and whenever it is absent)
 * only the file anchor and stderr carry entries.
 *
 * @summary Structured logging for the OpenCode Cards hooks
 * @module hook-log
 */

import { dirname } from 'node:path';
import type { Plugin } from '@opencode-ai/plugin';
import { defaultOpencodeStateIo, type OpencodeStateIo, resolveHookLogFile } from './opencode-state.js';

/** The OpenCode SDK client handed to every plugin factory. */
export type OpencodeClient = Parameters<Plugin>[0]['client'];

/** Severity levels accepted by `client.app.log`. */
export type OpencodeLogLevel = 'debug' | 'info' | 'error' | 'warn';

/** Log service name stamped on every `client.app.log` entry. */
export const LOG_SERVICE = 'cards-opencode-hooks';

/** Options for {@link createOpencodeLog}. */
export interface CreateOpencodeLogOptions {
  /** Live SDK client, or `null` before plugin init / when unavailable. */
  client: OpencodeClient | null;
  /** Session working directory anchoring git/config lookups. */
  cwd: string;
  /** Environment snapshot consulted for the log override variable. */
  env?: NodeJS.ProcessEnv;
  /** Filesystem seam; defaults to the real implementation. */
  io?: OpencodeStateIo;
}

/** Async structured logger shared by every handler in one plugin bundle. */
export interface OpencodeLog {
  /** Informational entry — server log + file anchor only. */
  info(message: string, extra?: Record<string, unknown>): Promise<void>;
  /** Warning entry — additionally mirrored to stderr. */
  warn(message: string, extra?: Record<string, unknown>): Promise<void>;
  /** Error entry — additionally mirrored to stderr. */
  error(message: string, extra?: Record<string, unknown>): Promise<void>;
}

/**
 * Creates the bundle-wide logging sink.
 *
 * The file-anchor path resolves lazily on first write and is cached, matching
 * the Claude default-log-file lifecycle: nothing touches the filesystem until
 * an entry actually needs writing.
 *
 * @param options - Client, working directory, and injectable seams.
 * @returns A logger safe to call from any handler.
 */
export function createOpencodeLog(options: CreateOpencodeLogOptions): OpencodeLog {
  const { client, cwd } = options;
  const env = options.env ?? process.env;
  const io = options.io ?? defaultOpencodeStateIo;

  let cachedPath: string | null | undefined;

  const logFile = (): string | null => {
    if (cachedPath === undefined) {
      cachedPath = resolveHookLogFile(io, env, cwd);
    }
    return cachedPath;
  };

  const write = async (level: OpencodeLogLevel, message: string, extra?: Record<string, unknown>): Promise<void> => {
    if (client) {
      try {
        await client.app.log({
          body: {
            service: LOG_SERVICE,
            level,
            message,
            ...(extra === undefined ? {} : { extra })
          }
        });
      } catch {
        // The server log is best-effort; stderr below is the guaranteed channel.
      }
    }

    const path = logFile();
    if (path) {
      try {
        const line = `${JSON.stringify({ ts: io.nowIso(), level, message, ...(extra === undefined ? {} : { extra }) })}\n`;
        io.ensureDirSync(dirname(path));
        io.appendFileSync(path, line);
      } catch {
        // Fail-open: a broken anchor must never take the session down.
      }
    }

    if (level === 'warn' || level === 'error') {
      process.stderr.write(`[opencode-cards-hooks] ${level}: ${message}${formatExtra(extra)}\n`);
    }
  };

  return {
    info: (message, extra) => write('info', message, extra),
    warn: (message, extra) => write('warn', message, extra),
    error: (message, extra) => write('error', message, extra)
  };
}

/**
 * Formats trailing detail for the stderr mirror.
 *
 * @param extra - Structured detail, when present.
 * @returns A ` :: {"key":"value"}` suffix, or the empty string.
 */
function formatExtra(extra?: Record<string, unknown>): string {
  return extra === undefined ? '' : ` :: ${JSON.stringify(extra)}`;
}
