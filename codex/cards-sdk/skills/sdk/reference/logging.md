<instructions>

This document describes the logging system in `@cards/sdk/config`.

## Logger Overview

The logger provides structured, context-aware logging that is safe for hook protocols:
- Never writes to stdout (reserved for protocol output)
- Never writes to stderr (avoids disrupting error handling)
- Output is opt-in via handlers or log file configuration
- Handler errors are silently ignored to never break hook execution

## Logger Interface

```typescript
interface ILogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  logError(error: unknown, message: string, context?: Record<string, unknown>): void;
}
```

## Basic Usage

The logger is available via context in all handlers:

```typescript
import { defineAction } from '@cards/sdk/config';

export default defineAction(
  { actionName: 'My Action' },
  async (input, context) => {
    const { logger } = context;

    // Log at different levels
    logger.debug('Detailed debugging info', { step: 1 });
    logger.info('Action started', { cardId: input.cardId });
    logger.warn('Potential issue detected', { reason: 'low disk space' });
    logger.error('Failed to connect', { service: 'api' });

    // Log caught exceptions with full error details
    try {
      await riskyOperation();
    } catch (err) {
      logger.logError(err, 'Risky operation failed', { operation: 'delete' });
      throw err; // Re-throw if needed
    }
  }
);
```

## Log Levels

| Level | Severity | Use Case |
|-------|----------|----------|
| `debug` | Lowest | Detailed debugging, development only |
| `info` | Low | General operational events, state changes |
| `warn` | Medium | Warning conditions, potential issues |
| `error` | High | Error conditions requiring attention |

## Log Event Structure

Each log event has a consistent structure:

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

## Logger Configuration

### File Output

The log file path is resolved at Logger construction time. Sources are listed from highest to lowest priority:

```typescript
import { Logger, logger } from '@cards/sdk/config';

// 1. setLogFile() — runtime override, takes precedence over everything below
logger.setLogFile('/var/log/hooks.log');

// 2. Constructor logFilePath
const explicit = new Logger({ logFilePath: '/var/log/hooks.log' });

// 3. CARDS_HOOKS_LOG_FILE env var (exact file path)
// export CARDS_HOOKS_LOG_FILE=/var/log/hooks.log

// 4. CARDS_LOG_DIR + subsystem → <CARDS_LOG_DIR>/<subsystem>.log
const viaSubsystem = new Logger({ subsystem: 'my-action' });

// Disable file logging
logger.setLogFile(null);
```

### Subsystem-Based Defaults

A Logger created with a `subsystem` resolves a default log file even when no
explicit path or `CARDS_HOOKS_LOG_FILE` env var is set. Resolution order
(highest precedence first):

1. `config.logFilePath`
2. `CARDS_HOOKS_LOG_FILE` (exact file)
3. `CARDS_LOG_DIR` + subsystem → `<CARDS_LOG_DIR>/<subsystem>.log`
4. Computed default → `<mainRepoRoot>/.cards/logs/<subsystem>.log`
5. Otherwise `null` (file output disabled)

Tiers 3 and 4 apply only when `subsystem` is set; tier 4 additionally requires
the main repo root to resolve. The main repo root prefers the `REPO_ROOT` env
var (present in action contexts) and otherwise derives it from `git rev-parse
--git-common-dir`, which collapses a linked worktree back to its owning main
repo. Non-standard git layouts (bare repos, submodules) fail closed to disabled
file output rather than writing to a wrong path.

### Event Handlers

Subscribe to log events programmatically:

```typescript
import { logger } from '@cards/sdk/config';

// Subscribe to specific level
const unsubscribe = logger.on('error', (event) => {
  console.error(`[${event.hookType}] ${event.message}`);
  if (event.error) {
    console.error(event.error.stack);
  }
});

// Later, clean up
unsubscribe();
```

### Forward to External Logger

```typescript
import { logger } from '@cards/sdk/config';
import pino from 'pino';

const pinoLogger = pino({ level: 'debug' });

logger.on('debug', (event) => pinoLogger.debug(event, event.message));
logger.on('info', (event) => pinoLogger.info(event, event.message));
logger.on('warn', (event) => pinoLogger.warn(event, event.message));
logger.on('error', (event) => pinoLogger.error(event, event.message));
```

## Error Logging

### logError Method

Use `logError` for caught exceptions to capture full error details:

```typescript
try {
  await fetch(url);
} catch (error) {
  // Captures: name, message, stack, cause chain
  logger.logError(error, 'Failed to fetch', { url });
}
```

### Non-Error Values

The logger normalizes non-Error thrown values:

```typescript
try {
  throw 'string error';
} catch (error) {
  logger.logError(error, 'Caught non-Error');
  // Logged as: { name: 'UnknownError', message: 'string error' }
}
```

### Error Cause Chain

ES2022 error cause is captured recursively:

```typescript
try {
  throw new Error('Outer', {
    cause: new Error('Inner', {
      cause: new Error('Root')
    })
  });
} catch (error) {
  logger.logError(error, 'Nested error');
  // error.cause.cause is fully captured
}
```

## Best Practices

### Do Not Use console.log

```typescript
// BAD - breaks protocol
console.log('Debug info');
console.error('Error info');

// GOOD - uses logger
logger.debug('Debug info');
logger.error('Error info');
```

### Include Relevant Context

```typescript
// BAD - no context
logger.info('Processing file');

// GOOD - includes context
logger.info('Processing file', {
  fileName: input.fileName,
  fileSize: input.fileSize,
  typeName: input.typeName
});
```

### Use Appropriate Levels

```typescript
// Debug: detailed internal state
logger.debug('Cache lookup', { key, hit: false });

// Info: normal operations
logger.info('Action completed', { duration: 1234 });

// Warn: recoverable issues
logger.warn('Rate limit approaching', { remaining: 10 });

// Error: failures requiring attention
logger.error('Failed to save', { reason: 'disk full' });
```

## Logger Methods Reference

| Method | Purpose |
|--------|---------|
| `debug(message, context?)` | Log debug message |
| `info(message, context?)` | Log info message |
| `warn(message, context?)` | Log warning message |
| `error(message, context?)` | Log error message |
| `logError(error, message, context?)` | Log caught exception with full details |
| `setLogFile(path \| null)` | Set or disable the log file (runtime override, highest priority) |
| `on(level, handler)` | Subscribe to events at a level; returns an unsubscribe function |

</instructions>
