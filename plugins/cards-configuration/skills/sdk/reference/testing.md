<instructions>

This document describes the testing utilities in `@cards/configuration`.

## Testing Utilities Overview

The testing module provides utilities for unit testing validators without stdin/stdout:
- `createTestRequest()` - Build mock HTTP requests
- `testValidation()` - Execute validators in test context

## createTestRequest

Build mock `ValidationRequest` objects for testing.

```typescript
import { createTestRequest } from '@cards/configuration';

// Minimal request (empty body)
const request = createTestRequest();

// With JSON body
const request = createTestRequest({
  method: 'PUT',
  path: '/note/my-note.md',
  body: { title: 'My Note', content: 'Hello world' }
});

// With string body
const request = createTestRequest({
  method: 'PUT',
  path: '/contract/api.yaml',
  body: 'openapi: "3.0.0"'
});

// With Buffer body
const request = createTestRequest({
  method: 'PUT',
  path: '/image/photo.png',
  body: Buffer.from([0x89, 0x50, 0x4E, 0x47])
});

// With custom headers
const request = createTestRequest({
  method: 'PUT',
  path: '/file.json',
  headers: {
    'content-type': 'application/json',
    'x-custom-header': 'value'
  },
  body: { key: 'value' }
});
```

### TestRequestOptions

```typescript
interface TestRequestOptions {
  method?: string;                    // Default: 'PUT'
  path?: string;                      // Default: '/test'
  httpVersion?: string;               // Default: 'HTTP/1.1'
  headers?: Record<string, string>;   // Additional headers
  body?: string | Buffer | object;    // Request body
}
```

**Automatic behaviors:**
- Object bodies are JSON-stringified
- Content-Length header is auto-computed
- Content-Type defaults to `application/json` for object bodies

## testValidation

Execute a validator and get the result without process I/O.

```typescript
import { testValidation, createTestRequest, typeValidation, validationCreated } from '@cards/configuration';

// Define a validator
const validator = typeValidation({}, async (request) => {
  const data = request.bodyJson<{ name: string }>();
  return validationCreated({ name: data.name });
});

// Test it
const result = await testValidation(validator, {
  body: { name: 'test' }
});

// Assert
expect(result.response.status).toBe(201);
expect(result.response.metadata).toEqual({ name: 'test' });
```

### TestValidationOptions

```typescript
interface TestValidationOptions {
  logger?: Logger;  // Custom logger (default: new Logger())
}
```

### TestValidationResult

```typescript
interface TestValidationResult {
  response: ValidationResponse;     // The response returned by the validator
  context: ValidationContext;       // The context that was passed to the validator
}
```

## Testing Patterns

### Basic Validator Test

```typescript
import { describe, it, expect } from 'vitest';
import { testValidation } from '@cards/configuration';
import myValidator from '../src/validators/my-validator.js';

describe('myValidator', () => {
  it('should accept valid input', async () => {
    const result = await testValidation(myValidator, {
      body: { type: 'AdaptiveCard', version: '1.5' }
    });

    expect(result.response.status).toBe(201);
  });

  it('should reject invalid type', async () => {
    const result = await testValidation(myValidator, {
      body: { type: 'Invalid', version: '1.5' }
    });

    expect(result.response.status).toBe(422);
    expect(result.response.body).toContain('INVALID_TYPE');
  });
});
```

### Testing Error Cases

```typescript
import { describe, it, expect } from 'vitest';
import { testValidation } from '@cards/configuration';
import noteValidator from '../src/validators/note-validator.js';

describe('noteValidator', () => {
  it('should reject missing frontmatter', async () => {
    const result = await testValidation(noteValidator, {
      body: '# Just a heading\n\nNo frontmatter here.'
    });

    expect(result.response.status).toBe(422);
    const body = JSON.parse(result.response.body as string);
    expect(body.errors).toContainEqual(
      expect.objectContaining({ code: 'MISSING_FRONTMATTER' })
    );
  });

  it('should reject invalid JSON', async () => {
    const result = await testValidation(noteValidator, {
      body: 'not valid json {{{',
      headers: { 'content-type': 'application/json' }
    });

    expect(result.response.status).toBe(400);
  });
});
```

### Testing Metadata

```typescript
describe('validator metadata', () => {
  it('should return computed metadata', async () => {
    const result = await testValidation(myValidator, {
      body: { type: 'Contract', version: '2.0' }
    });

    expect(result.response.status).toBe(201);
    expect(result.response.metadata).toEqual({
      contractVersion: '2.0',
      validatedAt: expect.any(Number)
    });
  });
});
```

### Testing Request Properties

```typescript
describe('validator request handling', () => {
  it('should access request headers', async () => {
    const result = await testValidation(myValidator, {
      headers: { 'x-custom': 'value' },
      body: {}
    });

    // Validator can access context.request.headers
    expect(result.response.status).toBe(201);
  });

  it('should handle binary content', async () => {
    const buffer = Buffer.from([0x00, 0x01, 0x02]);
    const result = await testValidation(binaryValidator, {
      body: buffer,
      headers: { 'content-type': 'application/octet-stream' }
    });

    expect(result.response.status).toBe(201);
  });
});
```

## Testing Action Handlers

For action handlers, mock the environment and context directly:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { Logger } from '@cards/configuration';

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
      workspacePath: '/test/workspace',
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
export function validateCard(card: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  // ... validation logic
  return errors;
}

// src/validators/card-validator.ts
import { validateCard } from './utils/validate-card.js';

export default defineTypeValidator(
  { typeName: 'card', sourcePath: fileURLToPath(import.meta.url) },
  async (request, context) => {
    const card = request.bodyJson();
    const errors = validateCard(card);
    if (errors.length > 0) {
      return validationError(422, errors);
    }
    return validationCreated();
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
  it('should handle empty body', async () => {
    const result = await testValidation(validator, { body: '' });
    expect(result.response.status).toBe(400);
  });

  it('should handle large payload', async () => {
    const largeBody = { data: 'x'.repeat(10000) };
    const result = await testValidation(validator, { body: largeBody });
    expect(result.response.status).toBe(201);
  });

  it('should handle unicode content', async () => {
    const result = await testValidation(validator, {
      body: { title: 'Test' }
    });
    expect(result.response.status).toBe(201);
  });
});
```

</instructions>
