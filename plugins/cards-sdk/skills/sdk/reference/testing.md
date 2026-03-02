<instructions>

This document describes the testing utilities in `@cards/sdk/config`.

## Testing Utilities Overview

The testing module provides utilities for unit testing validators without process I/O:
- `createTestRequest()` - Build mock `ValidatorFileRequest` objects
- `testValidation()` - Execute validators in test context

## createTestRequest

Build mock `ValidatorFileRequest` objects for testing.

```typescript
import { createTestRequest } from '@cards/sdk/config';

// Minimal request (default file path)
const request = createTestRequest();

// With custom file path
const request = createTestRequest({
  filePath: '/path/to/my-note.md'
});

// With file path and sidecar metadata
const request = createTestRequest({
  filePath: '/path/to/contract.json',
  metadata: { version: '1.0', previousChecksum: 'abc123' }
});
```

### TestRequestOptions

```typescript
interface TestRequestOptions {
  filePath?: string;                      // Default: '/test/file.json'
  metadata?: Record<string, unknown>;     // Parsed .meta.json sidecar content
}
```

## testValidation

Execute a validator and get the result without process I/O.

```typescript
import { testValidation, createTestRequest, defineTypeValidator, validationSuccess } from '@cards/sdk/config';

// Define a validator
const validator = defineTypeValidator({ typeName: 'test' }, async (request) => {
  // In real validators you'd read request.filePath from disk;
  // in tests, mock the file read or test logic directly
  return validationSuccess({ name: 'test' });
});

// Test it
const { result } = await testValidation(validator, {
  filePath: '/path/to/file.json'
});

// Assert
expect(result.valid).toBe(true);
if (result.valid) {
  expect(result.metadata).toEqual({ name: 'test' });
}
```

### TestValidationOptions

```typescript
interface TestValidationOptions {
  logger?: Logger;  // Custom logger (default: new Logger())
  context?: Partial<Omit<TypeValidatorContext, 'logger'>>;  // Optional context overrides
}
```

### TestValidationResult

```typescript
interface TestValidationResult {
  result: ValidationResult;           // The result returned by the validator
  context: TypeValidatorContext;         // The context that was passed to the validator
}
```

Where `ValidationResult` is:

```typescript
type ValidationResult = ValidationSuccess | ValidationFailure;

interface ValidationSuccess {
  valid: true;
  metadata?: Record<string, unknown>;
}

interface ValidationFailure {
  valid: false;
  errors: string[];
}
```

## Testing Patterns

### Basic Validator Test

```typescript
import { describe, it, expect } from 'vitest';
import { testValidation } from '@cards/sdk/config';
import myValidator from '../src/validators/my-validator.js';

describe('myValidator', () => {
  it('should accept valid input', async () => {
    const { result } = await testValidation(myValidator, {
      filePath: '/path/to/valid-card.json'
    });

    expect(result.valid).toBe(true);
  });

  it('should reject invalid input', async () => {
    const { result } = await testValidation(myValidator, {
      filePath: '/path/to/invalid-card.json'
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContainEqual(
        expect.stringContaining('type')
      );
    }
  });
});
```

### Testing Error Cases

```typescript
import { describe, it, expect } from 'vitest';
import { testValidation } from '@cards/sdk/config';
import noteValidator from '../src/validators/note-validator.js';

describe('noteValidator', () => {
  it('should reject missing frontmatter', async () => {
    const { result } = await testValidation(noteValidator, {
      filePath: '/path/to/no-frontmatter.md'
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContainEqual(
        expect.stringContaining('frontmatter')
      );
    }
  });

  it('should reject invalid JSON', async () => {
    const { result } = await testValidation(noteValidator, {
      filePath: '/path/to/invalid.json'
    });

    expect(result.valid).toBe(false);
  });
});
```

### Testing Metadata

```typescript
import type { ValidationSuccess } from '@cards/sdk/config';

describe('validator metadata', () => {
  it('should return computed metadata', async () => {
    const { result } = await testValidation(myValidator, {
      filePath: '/path/to/contract.json'
    });

    expect(result.valid).toBe(true);
    const success = result as ValidationSuccess;
    expect(success.metadata).toEqual({
      contractVersion: '2.0',
      validatedAt: expect.any(Number)
    });
  });
});
```

### Testing with Sidecar Metadata

```typescript
describe('validator with existing metadata', () => {
  it('should use sidecar metadata for version checking', async () => {
    const { result } = await testValidation(myValidator, {
      filePath: '/path/to/config.json',
      metadata: { version: 3 }
    });

    expect(result.valid).toBe(true);
  });

  it('should reject version downgrade', async () => {
    const { result } = await testValidation(myValidator, {
      filePath: '/path/to/config.json',
      metadata: { version: 5 }
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContainEqual(
        expect.stringContaining('version')
      );
    }
  });
});
```

## Testing Action Handlers

For action handlers, mock the environment and context directly:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { Logger } from '@cards/sdk/config';

// Import the handler module
import launchClaude from '../src/actions/launch-claude.js';

describe('launchClaude', () => {
  it('should process action input', async () => {
    const logger = new Logger();
    const logSpy = vi.fn();
    logger.on('info', logSpy);

    const mockInput = {
      cardId: 'card-123',
      environment: 'default',
      executionMode: 'interactive' as const,
      apiBaseUrl: 'https://api.example.com',
      apiAccessToken: 'test-token',
      repoRoot: '/test/workspace',
      cardRepoPath: '/test/repo'
    };

    const onCancelFn = vi.fn();
    const onSwitchToInteractiveFn = vi.fn();

    // Call the handler directly
    await launchClaude(mockInput, {
      logger,
      cwd: '/test/cwd',
      onCancel: (cb) => { onCancelFn(); cb(); },
      onSwitchToInteractive: (cb) => { onSwitchToInteractiveFn(); cb({}); }
    });

    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Launching Claude')
      })
    );
  });
});
```

## Best Practices

### Isolate Validator Logic

```typescript
// src/validators/utils/validate-card.ts
export function validateCard(card: unknown): string[] {
  const errors: string[] = [];
  // ... validation logic returning markdown error strings
  return errors;
}

// src/validators/card-validator.ts
import { readFileSync } from 'node:fs';
import { validateCard } from './utils/validate-card.js';

export default defineTypeValidator(
  { typeName: 'card' },
  async (request, context) => {
    const content = readFileSync(request.filePath, 'utf-8');
    const card = JSON.parse(content);
    const errors = validateCard(card);
    if (errors.length > 0) {
      return validationError(errors);
    }
    return validationSuccess();
  }
);

// test/validate-card.test.ts
import { validateCard } from '../src/validators/utils/validate-card.js';

describe('validateCard', () => {
  it('should return errors for invalid cards', () => {
    const errors = validateCard({ type: 'Invalid' });
    expect(errors).toHaveLength(1);
  });
});
```

### Test Edge Cases

```typescript
describe('edge cases', () => {
  it('should handle missing file gracefully', async () => {
    const { result } = await testValidation(validator, {
      filePath: '/nonexistent/file.json'
    });
    expect(result.valid).toBe(false);
  });

  it('should handle file with metadata sidecar', async () => {
    const { result } = await testValidation(validator, {
      filePath: '/path/to/file.json',
      metadata: { previousVersion: '1.0' }
    });
    expect(result.valid).toBe(true);
  });

  it('should handle file without metadata sidecar', async () => {
    const { result } = await testValidation(validator, {
      filePath: '/path/to/file.json'
    });
    expect(result.valid).toBe(true);
  });
});
```

</instructions>
