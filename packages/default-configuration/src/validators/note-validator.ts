/**
 * Note validator for custom types system.
 *
 * Validates note markdown files with YAML frontmatter.
 * Required fields: id, author, title
 * Content after frontmatter is optional.
 */

import { readFileSync } from 'node:fs';
import { defineTypeValidator, validationError, validationSuccess } from '@cards/sdk/config';
import matter from 'gray-matter';

/**
 * Note frontmatter structure.
 */
interface NoteFrontmatter {
  id: string;
  author: string;
  title: string;
}

/**
 * Validation error type alias.
 */
type ValError = { code: string; message: string; field?: string };

/**
 * Regex pattern to validate proper frontmatter structure.
 * Ensures both opening and closing delimiters are present.
 */
const FRONTMATTER_REGEX = /^---\r?\n[\s\S]*?\r?\n---/;

/**
 * Validates required field exists and is a non-empty string.
 */
function validateRequiredField(
  frontmatter: Record<string, unknown>,
  fieldName: keyof NoteFrontmatter
): ValError | null {
  const value = frontmatter[fieldName];

  // Check if field is missing
  if (value === undefined || value === null) {
    return { code: 'REQUIRED', message: `Field "${fieldName}" is required`, field: fieldName };
  }

  // Check if field is a string
  if (typeof value !== 'string') {
    return { code: 'INVALID_TYPE', message: `Field "${fieldName}" must be a string`, field: fieldName };
  }

  // Check if field is empty (after trimming)
  if (value.trim() === '') {
    return { code: 'EMPTY', message: `Field "${fieldName}" cannot be empty`, field: fieldName };
  }

  return null;
}

/**
 * Type validator for note files.
 *
 * Validates markdown files with YAML frontmatter containing required fields:
 * id, author, and title.
 */
export default defineTypeValidator({ typeName: 'note', timeout: 30000 }, async (request, context) => {
  const errors: ValError[] = [];

  context.logger.info('Validating note', { fileName: context.fileName });

  // Read content from file
  const content = readFileSync(request.filePath, 'utf-8');

  // Validate frontmatter structure (must have both opening and closing delimiters)
  if (!FRONTMATTER_REGEX.test(content)) {
    return validationError(['Note must have YAML frontmatter']);
  }

  // Parse markdown with frontmatter using gray-matter
  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(content);
  } catch (error) {
    context.logger.error('Failed to parse frontmatter', { error });
    return validationError(['Invalid YAML in frontmatter']);
  }

  const frontmatter = parsed.data as Record<string, unknown>;

  // Validate required fields
  const requiredFields: Array<keyof NoteFrontmatter> = ['id', 'author', 'title'];
  for (const field of requiredFields) {
    const error = validateRequiredField(frontmatter, field);
    if (error) {
      errors.push(error);
    }
  }

  // Return validation errors if any
  if (errors.length > 0) {
    context.logger.warn('Note validation failed', { errorCount: errors.length });
    return validationError(errors.map((e) => (e.field ? `**${e.field}**: ${e.message}` : e.message)));
  }

  // Validation succeeded
  context.logger.info('Note validation succeeded', {
    noteId: frontmatter['id'],
    author: frontmatter['author'],
    title: frontmatter['title']
  });

  return validationSuccess({ noteId: frontmatter['id'] as string });
});
