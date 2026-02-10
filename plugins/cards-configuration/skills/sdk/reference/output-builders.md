<instructions>

This document describes the validation result builders and output patterns in `@cards/sdk/config`.

## Validation Result Builders

Type validators must return a `ValidationResult` (from `@cards/sdk/protocol`) indicating success or failure. The result is a discriminated union:

```typescript
type ValidationResult = ValidationSuccess | ValidationFailure;

interface ValidationSuccess {
  valid: true;
  metadata?: Record<string, unknown>;
}

interface ValidationFailure {
  valid: false;
  errors: string[];  // Markdown-formatted error messages
}
```

### validationSuccess

Creates a successful validation result. Optionally include metadata to store in the `.meta.json` sidecar file.

```typescript
import { validationSuccess } from '@cards/sdk/config';

// Basic success
return validationSuccess();

// With metadata (stored in .meta.json)
return validationSuccess({
  version: '1.0',
  checksum: 'abc123',
  validatedAt: Date.now()
});
```

**Result Structure:**
```typescript
{ valid: true, metadata?: Record<string, unknown> }
```

### validationError

Creates a failed validation result with markdown-formatted error strings.

```typescript
import { validationError } from '@cards/sdk/config';

// Single error
return validationError([
  '**name**: Field is required'
]);

// Multiple errors
return validationError([
  '**name**: Field is required',
  '`age` must be a positive number',
  '**payload.type**: Must be `AdaptiveCard`'
]);
```

**Result Structure:**
```typescript
{ valid: false, errors: string[] }
```

Errors are markdown-formatted strings surfaced directly to the git client. Use markdown formatting for readability:
- `**fieldName**:` for field-specific errors
- Backticks for code references (e.g., `` `AdaptiveCard` ``)
- Plain text for general messages

## Common Validation Patterns

### JSON File Validation

```typescript
import { readFileSync } from 'node:fs';
import { defineTypeValidator, validationSuccess, validationError } from '@cards/sdk/config';

interface Contract {
  openapi: string;
  info: { title: string; version: string };
}

export default defineTypeValidator(
  { typeName: 'openapi-contract', sourcePath: fileURLToPath(import.meta.url) },
  async (request, context) => {
    // Read the file from disk
    let contract: Contract;
    try {
      const content = readFileSync(request.filePath, 'utf-8');
      contract = JSON.parse(content) as Contract;
    } catch {
      return validationError(['File must contain valid JSON']);
    }

    // Validate required fields
    const errors: string[] = [];

    if (!contract.openapi) {
      errors.push('**openapi**: Version is required');
    }

    if (!contract.info?.title) {
      errors.push('**info.title**: Title is required');
    }

    if (errors.length > 0) {
      return validationError(errors);
    }

    // Success with metadata
    return validationSuccess({
      openapiVersion: contract.openapi,
      title: contract.info.title
    });
  }
);
```

### Binary File Validation

```typescript
import { readFileSync } from 'node:fs';

export default defineTypeValidator(
  { typeName: 'image', sourcePath: fileURLToPath(import.meta.url) },
  async (request, context) => {
    // Read the file as a buffer
    const buffer = readFileSync(request.filePath);

    // Check file size
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (buffer.length > maxSize) {
      return validationError([`File size exceeds maximum of ${maxSize} bytes`]);
    }

    // Check magic bytes for PNG
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
    if (!isPng) {
      return validationError(['File must be a valid PNG image']);
    }

    return validationSuccess({
      size: buffer.length
    });
  }
);
```

### Markdown File Validation

```typescript
import { readFileSync } from 'node:fs';

export default defineTypeValidator(
  { typeName: 'note', sourcePath: fileURLToPath(import.meta.url) },
  async (request, context) => {
    const content = readFileSync(request.filePath, 'utf-8');

    // Check for required frontmatter
    if (!content.startsWith('---')) {
      return validationError(['Note must start with YAML frontmatter']);
    }

    // Parse frontmatter
    const frontmatterEnd = content.indexOf('---', 3);
    if (frontmatterEnd === -1) {
      return validationError(['Frontmatter must be closed with `---`']);
    }

    const frontmatter = content.slice(4, frontmatterEnd).trim();

    // Check required fields in frontmatter
    if (!frontmatter.includes('title:')) {
      return validationError(['**title**: Required in frontmatter']);
    }

    context.logger.info('Note validated', { file: context.fileName });
    return validationSuccess();
  }
);
```

### Using Sidecar Metadata

Validators can check existing `.meta.json` sidecar data via `request.metadata`:

```typescript
import { readFileSync } from 'node:fs';

export default defineTypeValidator(
  { typeName: 'config', sourcePath: fileURLToPath(import.meta.url) },
  async (request, context) => {
    const content = readFileSync(request.filePath, 'utf-8');
    const config = JSON.parse(content) as { version: number };

    // Check previous metadata if sidecar exists
    if (request.metadata) {
      const previousVersion = request.metadata['version'] as number | undefined;
      if (previousVersion !== undefined && config.version <= previousVersion) {
        return validationError([
          `**version**: Must be greater than previous version (${previousVersion})`
        ]);
      }
    }

    return validationSuccess({ version: config.version });
  }
);
```

## Error Handling Best Practices

### Use Descriptive Markdown Errors

Format errors as readable markdown strings:

```typescript
// Good: descriptive, markdown-formatted
return validationError([
  '**name**: Field is required',
  '**payload.type**: Must be `AdaptiveCard`',
  'File size exceeds the 5 MB limit'
]);

// Bad: terse, no formatting
return validationError([
  'missing name',
  'wrong type'
]);
```

### Catching Internal Errors

The `executeValidation` runtime converts uncaught exceptions to failure results:

```typescript
export default defineTypeValidator(
  { typeName: 'risky', sourcePath: fileURLToPath(import.meta.url) },
  async (request, context) => {
    try {
      const content = readFileSync(request.filePath, 'utf-8');
      const result = await riskyOperation(JSON.parse(content));
      return validationSuccess(result);
    } catch (error) {
      // Log and return controlled error
      context.logger.logError(error, 'Validation failed');
      return validationError(['Validation failed unexpectedly']);
    }
  }
);
```

## Metadata Storage

Metadata from `validationSuccess()` is stored in a `.meta.json` sidecar file alongside the validated file.

```typescript
// Validator returns:
return validationSuccess({
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
