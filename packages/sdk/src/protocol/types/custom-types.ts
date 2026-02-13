/**
 * Custom type system contracts for Cards V2 typed files.
 *
 * Custom types allow files to be validated by external validators and enriched
 * with metadata. The protocol models the validator handshake and the metadata
 * stored alongside typed files.
 *
 * @module types/custom-types
 */

/**
 * Configuration for a single custom type.
 */
export interface TypeConfig {
  /** Semantic version of the type schema used for compatibility checks. */
  version: string;
  /** Validator configuration describing how to execute validation. */
  validator: {
    /** Command to execute the validator (e.g., "node ./validators/contract.mjs"). */
    command: string;
    /** Optional timeout in milliseconds before the validator is terminated. */
    timeout?: number;
  };
  /** Human-readable schema describing the expected file format. */
  schema?: string;
  /** Description of the type's purpose. */
  description?: string;
}

/**
 * Map of type names to their validator configuration.
 */
export type TypesConfig = Record<string, TypeConfig>;

/**
 * Result from a validator process (stdout JSON).
 *
 * Validators receive file information via environment variables and must
 * write a ValidationResult JSON object to stdout.
 */
export type ValidationResult = ValidationSuccess | ValidationFailure;

/**
 * Successful validation result.
 */
export interface ValidationSuccess {
  /** Discriminator indicating successful validation. */
  valid: true;
  /** Optional metadata to store in .meta.json sidecar. */
  metadata?: Record<string, unknown>;
}

/**
 * Failed validation result.
 */
export interface ValidationFailure {
  /** Discriminator indicating validation failure. */
  valid: false;
  /** Markdown-formatted error messages surfaced to the git client. */
  errors: string[];
}

/**
 * Metadata stored in the .meta.json sidecar file for a typed asset.
 */
export interface TypedFileMetadata {
  /** MIME content type detected for the file. */
  contentType: string;
  /** SHA-256 hash of the file content. */
  sha256: string;
  /** Custom type name associated with the file. */
  type: string;
  /** Custom type version in effect at validation time. */
  typeVersion: string;
  /** Optional metadata produced by the validator. */
  metadata?: Record<string, unknown>;
}

/**
 * Input payload passed to typed file lifecycle hooks.
 */
export interface TypedFileHookInput {
  /** Card ID that owns the typed file. */
  cardId: string;
  /** Name of the custom type. */
  typeName: string;
  /** File name within the type directory. */
  fileName: string;
  /** Absolute path to the file. */
  filePath: string;
  /** MIME content type detected for the file. */
  contentType: string;
  /** File size in bytes. */
  size: number;
  /** SHA-256 hash of the file content. */
  sha256: string;
  /** Custom type version in effect at validation time. */
  typeVersion: string;
  /** Optional metadata produced by the validator. */
  metadata?: Record<string, unknown>;
}
