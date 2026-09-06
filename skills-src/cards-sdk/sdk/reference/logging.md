<instructions>

## Logger Overview

The logger never writes to stdout (reserved for protocol output) or stderr. Output is opt-in via event handlers or log file configuration. Log write and handler failures are silently ignored, so logging never breaks hook execution — never assert on log delivery.

```typescript
interface ILogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  logError(error: unknown, message: string, context?: Record<string, unknown>): void;
}
```

| Level | Use for |
|-------|---------|
| `debug` | Internal state, development only (`{ key, hit: false }`) |
| `info` | Normal operations and state changes |
| `warn` | Recoverable issues |
| `error` | Failures requiring attention |

Always pass a context object; a bare message is not actionable. Never use `console.log`/`console.error` in a handler — it breaks the protocol.

## Basic Usage

The logger is available via context in all handlers:

```typescript
import { defineAction } from '@cards.management/sdk/config';

export default defineAction(
  { actionName: 'My Action' },
  async (input, context) => {
    const { logger } = context;

    logger.info('Action started', { cardId: input.cardId });
    logger.warn('Potential issue detected', { reason: 'low disk space' });

    try {
      await riskyOperation();
    } catch (err) {
      logger.logError(err, 'Risky operation failed', { operation: 'delete' });
      throw err;
    }
  }
);
```

## Log Event Structure

```typescript
interface LogEvent {
  timestamp: string;              // ISO 8601 timestamp
  level: LogLevel;                // 'debug' | 'info' | 'warn' | 'error'
  hookType?: string;              // Hook type (set by runtime)
  message: string;                // Human-readable description
  input?: Record<string, unknown>; // Hook input data (set by runtime)
  error?: LogEventError;          // Structured error info (for logError)
  context?: Record<string, unknown>; // Additional context from caller
}

interface LogEventError {
  name: string;           // Error name (e.g., 'TypeError')
  message: string;        // Error message
  stack?: string;         // Stack trace
  cause?: LogEventError;  // Nested cause chain
}
```

## Log File Resolution

`setLogFile()` is a runtime override applied after construction; everything below it resolves once, at Logger construction. Highest precedence first:

1. `logger.setLogFile('/var/log/hooks.log')` — runtime override; `setLogFile(null)` disables file output
2. `new Logger({ logFilePath: '/var/log/hooks.log' })`
3. `CARDS_HOOKS_LOG_FILE` env var — exact file path
4. `CARDS_LOG_DIR` env var + subsystem → `<CARDS_LOG_DIR>/<subsystem>.log`
5. Computed default → `<mainRepoRoot>/.cards/logs/<subsystem>.log`
6. Otherwise `null` — file output disabled

Tiers 4 and 5 apply only when `new Logger({ subsystem: 'my-action' })` sets a subsystem; tier 5 additionally requires the main repo root to resolve. The main repo root prefers the `REPO_ROOT` env var (present in action contexts) and otherwise derives it from `git rev-parse --git-common-dir`, which collapses a linked worktree back to its owning main repo. Non-standard git layouts (bare repos, submodules) fail closed to disabled file output rather than writing to a wrong path.

## Event Handlers

`on(level, handler)` subscribes to one level and returns an unsubscribe function. Use it to forward events to an external logger (pino, etc.) — subscribe per level, one call each.

```typescript
import { Logger } from '@cards.management/sdk/config';

const logger = new Logger();

const unsubscribe = logger.on('error', (event) => {
  console.error(`[${event.hookType}] ${event.message}`);
  if (event.error) console.error(event.error.stack);
});

unsubscribe();
```

## Error Logging

`logError(error, message, context?)` captures `name`, `message`, `stack`, and the full ES2022 `cause` chain recursively. Non-Error throws normalize to `{ name: 'UnknownError', message: String(error) }`. Usage: the `try/catch` in Basic Usage above.

</instructions>
