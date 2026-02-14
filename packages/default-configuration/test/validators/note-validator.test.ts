/**
 * Tests for Note validator - validates markdown files with YAML frontmatter.
 *
 * Required fields: id, author, title
 * Content after frontmatter is optional.
 *
 * @summary Tests for Note validator - validates markdown files with YAML frontmatter
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TypeValidatorContext, ValidatorFileRequest } from '@cards/sdk/config';
import type { ValidationResult } from '@cards/sdk/protocol';
import { afterEach, describe, expect, it } from 'vitest';
import validateNote from '../../src/validators/note-validator.js';

/**
 * Temp directories created during tests, cleaned up in afterEach.
 */
const tempDirs: string[] = [];

/**
 * Creates a temp file with the given content and returns a ValidatorFileRequest.
 *
 * @param content Markdown content to persist in a temp file.
 * @param fileName File name to create in the temp directory.
 * @returns Validator file request pointing to the generated temp file.
 */
function createRequestFile(content: string, fileName = 'test.md'): ValidatorFileRequest {
  const dir = mkdtempSync(join(tmpdir(), 'validator-test-'));
  tempDirs.push(dir);
  const filePath = join(dir, fileName);
  writeFileSync(filePath, content);
  return { filePath };
}

/**
 * Creates a mock TypeValidatorContext.
 *
 * @param overrides Optional context field overrides for a test case.
 * @returns A complete validator context with defaults plus overrides.
 */
function createContext(overrides: Partial<TypeValidatorContext> = {}): TypeValidatorContext {
  return {
    logger: {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
      logError: () => {}
    } as TypeValidatorContext['logger'],
    cwd: '/tmp/test',
    typeName: 'note',
    typeVersion: '1.0.0',
    fileName: 'test.md',
    cardId: 'test-card',
    environment: 'default',
    apiBaseUrl: 'http://localhost:3000',
    apiAccessToken: 'test-token',
    ...overrides
  };
}

/**
 * Helper to get error messages from a failed ValidationResult.
 *
 * @param result Validation result returned by the validator.
 * @returns Error messages when invalid; otherwise an empty array.
 */
function getErrors(result: ValidationResult): string[] {
  if (!result.valid) {
    return result.errors;
  }
  return [];
}

afterEach(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tempDirs.length = 0;
});

describe('note validator', () => {
  describe('valid notes', () => {
    it('passes for valid note with all required fields', async () => {
      const content = `---
id: note-1
author: user@example.com
title: My First Note
---

This is the note content.
`;

      const result = await validateNote(createRequestFile(content), createContext());
      expect(result.valid).toBe(true);
    });

    it('passes for minimal valid note (frontmatter only)', async () => {
      const content = `---
id: minimal-note
author: user
title: Minimal Note
---
`;

      const result = await validateNote(createRequestFile(content), createContext());
      expect(result.valid).toBe(true);
    });

    it('passes for note with extra frontmatter fields', async () => {
      const content = `---
id: extended-note
author: user
title: Extended Note
tags:
  - important
  - work
created: 2024-01-15
---

Content here.
`;

      const result = await validateNote(createRequestFile(content), createContext());
      expect(result.valid).toBe(true);
    });

    it('passes for note with markdown content', async () => {
      const content = `---
id: markdown-note
author: user
title: Markdown Note
---

# Heading

This is a paragraph with **bold** and *italic* text.

- List item 1
- List item 2

\`\`\`javascript
console.log('code block');
\`\`\`
`;

      const result = await validateNote(createRequestFile(content), createContext());
      expect(result.valid).toBe(true);
    });
  });

  describe('missing frontmatter', () => {
    it('returns error for file without frontmatter', async () => {
      const content = 'Just some content without frontmatter';

      const result = await validateNote(createRequestFile(content), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('must have YAML frontmatter'))).toBe(true);
    });

    it('returns error for file with only opening delimiter', async () => {
      const content = `---
id: incomplete
author: user
title: Incomplete`;

      const result = await validateNote(createRequestFile(content), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('must have YAML frontmatter'))).toBe(true);
    });

    it('returns error for empty file', async () => {
      const content = '';

      const result = await validateNote(createRequestFile(content), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('must have YAML frontmatter'))).toBe(true);
    });
  });

  describe('missing required fields', () => {
    it('returns error for missing id', async () => {
      const content = `---
author: user
title: No ID Note
---
`;

      const result = await validateNote(createRequestFile(content), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('"id" is required'))).toBe(true);
    });

    it('returns error for missing author', async () => {
      const content = `---
id: note-no-author
title: No Author Note
---
`;

      const result = await validateNote(createRequestFile(content), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('"author" is required'))).toBe(true);
    });

    it('returns error for missing title', async () => {
      const content = `---
id: note-no-title
author: user
---
`;

      const result = await validateNote(createRequestFile(content), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('"title" is required'))).toBe(true);
    });

    it('returns error for multiple missing fields', async () => {
      const content = `---
id: only-id
---
`;

      const result = await validateNote(createRequestFile(content), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).length).toBeGreaterThan(1);
    });
  });

  describe('empty field values', () => {
    it('returns error for empty id', async () => {
      const content = `---
id: ""
author: user
title: Empty ID Note
---
`;

      const result = await validateNote(createRequestFile(content), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('"id" cannot be empty'))).toBe(true);
    });

    it('returns error for empty author', async () => {
      const content = `---
id: note-empty-author
author: ""
title: Empty Author Note
---
`;

      const result = await validateNote(createRequestFile(content), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('"author" cannot be empty'))).toBe(true);
    });

    it('returns error for empty title', async () => {
      const content = `---
id: note-empty-title
author: user
title: ""
---
`;

      const result = await validateNote(createRequestFile(content), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('"title" cannot be empty'))).toBe(true);
    });

    it('returns error for whitespace-only values', async () => {
      const content = `---
id: "   "
author: user
title: Whitespace ID
---
`;

      const result = await validateNote(createRequestFile(content), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('"id" cannot be empty'))).toBe(true);
    });
  });

  describe('invalid field types', () => {
    it('returns error for non-string id', async () => {
      const content = `---
id: 123
author: user
title: Numeric ID Note
---
`;

      const result = await validateNote(createRequestFile(content), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('"id" must be a string'))).toBe(true);
    });

    it('returns error for non-string author', async () => {
      const content = `---
id: note-bad-author
author:
  name: John
  email: john@example.com
title: Object Author Note
---
`;

      const result = await validateNote(createRequestFile(content), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('"author" must be a string'))).toBe(true);
    });

    it('returns error for non-string title', async () => {
      const content = `---
id: note-bad-title
author: user
title:
  - Part 1
  - Part 2
---
`;

      const result = await validateNote(createRequestFile(content), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('"title" must be a string'))).toBe(true);
    });
  });

  describe('invalid YAML', () => {
    it('returns error for malformed YAML in frontmatter', async () => {
      const content = `---
id: note-bad-yaml
author: user
title: Bad YAML
  indented_wrong: true
---
`;

      const result = await validateNote(createRequestFile(content), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('Invalid YAML'))).toBe(true);
    });
  });
});
