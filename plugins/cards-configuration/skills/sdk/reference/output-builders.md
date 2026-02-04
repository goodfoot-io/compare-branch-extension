<instructions>

This document describes the validation response builders and output patterns in `@cards/configuration`.

## Validation Response Builders

Type validators must return a `ValidationResponse` indicating success or failure.

### validationCreated

Creates a 201 Created response for new resources.

```typescript
import { validationCreated } from '@cards/configuration';

// Basic success
return validationCreated();

// With metadata (stored in .meta.json)
return validationCreated({
  version: '1.0',
  checksum: 'abc123',
  validatedAt: Date.now()
});
```

**Response Structure:**
```typescript
{ status: 201, metadata?: Record<string, unknown> }
```

### validationUpdated

Creates a 200 OK response for updated resources.

```typescript
import { validationUpdated } from '@cards/configuration';

// Basic success
return validationUpdated();

// With metadata
return validationUpdated({
  version: '1.1',
  lastModified: Date.now()
});
```

**Response Structure:**
```typescript
{ status: 200, metadata?: Record<string, unknown> }
```

### validationError

Creates an error response with structured error details.

```typescript
import { validationError, type ValidationError } from '@cards/configuration';

const errors: ValidationError[] = [
  { code: 'ERR_REQUIRED', message: 'Name is required', field: 'name' },
  { code: 'ERR_TYPE', message: 'Age must be a number', field: 'age' }
];

// With errors only
return validationError(422, errors);

// With errors and message
return validationError(422, errors, 'Validation failed');
```

**Response Structure:**
```typescript
{
  status: number,
  body: '{"errors":[...],"message":"..."}',
  headers: { 'Content-Type': 'application/json' }
}
```

**ValidationError Interface:**
```typescript
interface ValidationError {
  code: string;     // Machine-readable error code
  message: string;  // Human-readable error message
  field?: string;   // Optional field name that caused the error
}
```

### validationResponse

Pass through a custom validation response for full control.

```typescript
import { validationResponse } from '@cards/configuration';

return validationResponse({
  status: 418,
  headers: { 'X-Custom': 'teapot' },
  body: 'I am a teapot',
  metadata: { custom: true }
});
```

**Full Response Interface:**
```typescript
interface ValidationResponse {
  status?: number;                       // HTTP status code
  headers?: Record<string, string>;      // HTTP response headers
  body?: string | Buffer;                // Response body
  metadata?: Record<string, unknown>;    // Metadata for .meta.json
}
```

## Common Validation Patterns

### JSON Schema Validation

```typescript
import { defineTypeValidator, validationCreated, validationError } from '@cards/configuration';

interface Contract {
  openapi: string;
  info: { title: string; version: string };
}

export default defineTypeValidator(
  { typeName: 'openapi-contract', sourcePath: fileURLToPath(import.meta.url) },
  async (request, context) => {
    // Parse JSON
    let contract: Contract;
    try {
      contract = request.bodyJson<Contract>();
    } catch (err) {
      return validationError(400, [
        { code: 'PARSE_ERROR', message: 'Invalid JSON', field: 'body' }
      ]);
    }

    // Validate required fields
    const errors: ValidationError[] = [];

    if (!contract.openapi) {
      errors.push({ code: 'MISSING_FIELD', message: 'openapi version required', field: 'openapi' });
    }

    if (!contract.info?.title) {
      errors.push({ code: 'MISSING_FIELD', message: 'info.title required', field: 'info.title' });
    }

    if (errors.length > 0) {
      return validationError(422, errors, 'OpenAPI validation failed');
    }

    // Success with metadata
    return validationCreated({
      openapiVersion: contract.openapi,
      title: contract.info.title
    });
  }
);
```

### Content Type Validation

```typescript
export default defineTypeValidator(
  { typeName: 'image', sourcePath: fileURLToPath(import.meta.url) },
  async (request, context) => {
    const contentType = request.headers['content-type'] ?? '';

    // Validate content type
    if (!contentType.startsWith('image/')) {
      return validationError(415, [
        { code: 'INVALID_CONTENT_TYPE', message: `Expected image/*, got ${contentType}` }
      ]);
    }

    // Check file size (from body buffer)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (request.body.length > maxSize) {
      return validationError(413, [
        { code: 'FILE_TOO_LARGE', message: `Max size is ${maxSize} bytes` }
      ]);
    }

    return validationCreated({
      contentType,
      size: request.body.length
    });
  }
);
```

### Markdown Validation

```typescript
export default defineTypeValidator(
  { typeName: 'note', sourcePath: fileURLToPath(import.meta.url) },
  async (request, context) => {
    const content = request.bodyText;

    // Check for required frontmatter
    if (!content.startsWith('---')) {
      return validationError(422, [
        { code: 'MISSING_FRONTMATTER', message: 'Note must start with YAML frontmatter' }
      ]);
    }

    // Parse frontmatter
    const frontmatterEnd = content.indexOf('---', 3);
    if (frontmatterEnd === -1) {
      return validationError(422, [
        { code: 'INVALID_FRONTMATTER', message: 'Frontmatter must be closed with ---' }
      ]);
    }

    const frontmatter = content.slice(4, frontmatterEnd).trim();

    // Check required fields in frontmatter
    if (!frontmatter.includes('title:')) {
      return validationError(422, [
        { code: 'MISSING_TITLE', message: 'Frontmatter must include title', field: 'title' }
      ]);
    }

    context.logger.info('Note validated', { file: context.fileName });
    return validationCreated();
  }
);
```

### Conditional Updates

```typescript
export default defineTypeValidator(
  { typeName: 'config', sourcePath: fileURLToPath(import.meta.url) },
  async (request, context) => {
    const config = request.bodyJson<{ version: number }>();

    // Check if this is a create or update based on HTTP method
    const isUpdate = request.method === 'PUT';

    if (isUpdate) {
      // For updates, validate version increment
      if (config.version <= 1) {
        return validationError(409, [
          { code: 'VERSION_CONFLICT', message: 'Version must be incremented' }
        ]);
      }
      return validationUpdated({ version: config.version });
    }

    // For creates
    return validationCreated({ version: config.version });
  }
);
```

## Error Handling Best Practices

### Structured Error Codes

Use consistent, machine-readable error codes:

```typescript
const ErrorCodes = {
  PARSE_ERROR: 'PARSE_ERROR',
  MISSING_FIELD: 'MISSING_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_TYPE: 'UNSUPPORTED_TYPE',
  VERSION_CONFLICT: 'VERSION_CONFLICT'
} as const;

// Usage
return validationError(422, [
  { code: ErrorCodes.MISSING_FIELD, message: 'Name is required', field: 'name' }
]);
```

### HTTP Status Code Guidelines

| Status | Use Case |
|--------|----------|
| 200 | Update succeeded |
| 201 | Create succeeded |
| 400 | Malformed request (parse error, bad JSON) |
| 409 | Conflict (version mismatch, duplicate) |
| 413 | Payload too large |
| 415 | Unsupported media type |
| 422 | Validation failed (semantic errors) |
| 500 | Internal error (caught exceptions) |

### Catching Internal Errors

The `executeValidation` runtime converts uncaught exceptions to 500 responses:

```typescript
export default defineTypeValidator(
  { typeName: 'risky', sourcePath: fileURLToPath(import.meta.url) },
  async (request, context) => {
    try {
      const result = await riskyOperation(request.bodyJson());
      return validationCreated(result);
    } catch (error) {
      // Log and return controlled error
      context.logger.logError(error, 'Validation failed');
      return validationError(500, [
        { code: 'INTERNAL_ERROR', message: 'Validation failed unexpectedly' }
      ]);
    }
  }
);
```

## Metadata Storage

Metadata from `validationCreated()` and `validationUpdated()` is stored in a `.meta.json` file alongside the validated file.

```typescript
// Validator returns:
return validationCreated({
  schema: 'openapi-3.0',
  validatedAt: Date.now(),
  checksum: computeChecksum(content)
});

// Results in .meta.json:
{
  "schema": "openapi-3.0",
  "validatedAt": 1705123456789,
  "checksum": "abc123..."
}
```

Use metadata for:
- Caching validation results
- Storing computed values
- Tracking validation history
- Passing data to lifecycle hooks

</instructions>
