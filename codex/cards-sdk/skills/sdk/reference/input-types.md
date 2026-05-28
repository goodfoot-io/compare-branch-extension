<instructions>

This document describes the typed input structures available in `@cards/sdk/config`.

## Action Input Types

### ActionInput

Input payload for action handlers. Extracted from environment variables by the runtime.

```typescript
interface ActionInput {
  cardId: string;                         // Unique card identifier
  actionName: string;                     // Action button display name (e.g., "Launch Claude")
  environment: string;                    // Environment name (e.g., "default")
  executionMode: 'interactive' | 'background';  // UI interaction model
  codingAgent?: string;                   // Configured AI coding assistant
  switchToInteractiveData?: unknown;      // Data from user switching to interactive mode
  repoRoot: string;                       // Main git repository root (NOT a worktree)
  cardRepoPath: string;                   // Card repository path
}
```

**Usage Example:**

```typescript
async (input: ActionInput, context) => {
  const { logger, onCancel, onSwitchToInteractive } = context;

  // Access card context
  logger.info(`Processing card ${input.cardId}`);
  logger.info(`Action: ${input.actionName}`);
  logger.info(`Environment: ${input.environment}`);

  // Handle cancellation
  onCancel(() => {
    logger.info('Action cancelled');
  });

  // Handle switch to interactive mode
  if (input.switchToInteractiveData) {
    logger.info('User switched to interactive', { data: input.switchToInteractiveData });
  }

  // Check execution mode for UI decisions
  if (input.executionMode === 'interactive') {
    // Show progress indicators
  }

  // Use repo root for git operations
  const configFile = path.join(input.repoRoot, 'config.json');
}
```

## Context Types

### ActionContext

Runtime context injected for **action** handlers.

```typescript
interface ActionContext {
  logger: ILogger;  // Logger for structured, context-aware logging
  cwd: string;      // Current working directory for the action
  onCancel(callback: () => void | Promise<void>): void;  // Register cancellation handler
  onSwitchToInteractive(callback: () => unknown | Promise<unknown>): void;  // Register switch handler
}
```

**Usage Example:**

```typescript
async (input: ActionInput, context: ActionContext) => {
  const { logger, onCancel, onSwitchToInteractive } = context;

  logger.info('Action started', { cwd: context.cwd });

  // Register cancellation handler
  onCancel(() => {
    logger.info('User cancelled the action');
    // Cleanup code here
  });

  // Register handler for user switching to interactive mode
  onSwitchToInteractive(() => {
    logger.info('Switching to interactive mode');
    return { sessionId: 'abc123' };  // Data passed to relaunched handler
  });

  // Use cwd for file operations
  const configPath = path.join(context.cwd, 'config.json');
  if (await fs.exists(configPath)) {
    const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
  }
}
```

### Typed Input Extraction

Extract complete typed input objects:

```typescript
import { extractActionInput } from '@cards/sdk/config';

// For action handlers
const actionInput = extractActionInput();
// Returns ActionInput with all fields
```

## Switch to Interactive Flow

Actions can signal a need to switch from background to interactive mode. This allows long-running background tasks to transition to interactive user control when needed.

### Registering the Switch Callback

Register a callback with `onSwitchToInteractive()`. The callback takes **no arguments** and returns serializable data. The runtime handles everything else automatically: it sends the data via socket, then exits with code 42.

```typescript
export default defineAction(
  { actionName: 'Long Task' },
  async (input, context) => {
    const { logger, onSwitchToInteractive } = context;

    // Perform initial background work
    logger.info('Starting background phase');

    // Register callback — runtime calls this when user requests interactive mode
    onSwitchToInteractive(() => {
      logger.info('Switching to interactive mode');

      // Return data to pass to the relaunched handler
      // The runtime sends this via socket and exits with code 42 automatically
      return {
        phase: 'interactive',
        previousProgress: { completed: 100 }
      };
    });

    // Continue background work...
  }
);
```

### Resuming with Interactive Data

When the action is rerun in interactive mode, the data returned by the callback is available via `input.switchToInteractiveData`:

```typescript
export default defineAction(
  { actionName: 'Long Task' },
  async (input: ActionInput, context) => {
    const { logger } = context;

    // Check if we're resuming from a background phase
    if (input.switchToInteractiveData) {
      logger.info('Resuming in interactive mode', {
        previousData: input.switchToInteractiveData
      });

      // Resume from saved state
      const state = input.switchToInteractiveData as { phase: string; previousProgress: unknown };
      logger.info(`Continuing from phase: ${state.phase}`);
    } else {
      logger.info('Starting fresh in interactive mode');
    }
  }
);
```

### Key Differences in Interactive Mode

| Aspect | Background Mode | Interactive Mode |
|--------|-----------------|------------------|
| User can see output | No | Yes |
| Can wait for user input | No | Yes |
| Timeout | Shorter (background ops) | Longer (user interactions) |
| Cancellation | Silent | Visible in UI |
| Data persistence | Callback return value sent via socket | Via `input.switchToInteractiveData` |

</instructions>
