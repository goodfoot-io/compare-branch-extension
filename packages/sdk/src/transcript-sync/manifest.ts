/**
 * Session sync manifest — the fail-closed contract between a session-start
 * hook (which knows the runtime's on-disk transcript layout) and the
 * transcript-sync engine (which only knows how to tail/copy files described
 * by a manifest). Runtime-specific knowledge lives entirely in the adapters
 * under `./adapters/`; this module only defines the shape and validates it.
 *
 * There is no schema library dependency here (the sdk package does not
 * depend on zod) — validation is hand-rolled to match the rest of the
 * package's idioms (see `worktree.ts`, `cardsParentBranch.ts`).
 *
 * @summary Session sync manifest types and fail-closed validation
 * @module
 */

/**
 * Describes one file or glob pattern the engine should watch within a
 * session's `watchRoot`, synced as bytes (`jsonl-tail`/`copy` modes).
 */
export interface FileSourceSpec {
  /** Literal path or glob, relative to `watchRoot`, using forward slashes. */
  pattern: string;
  /** Role of the matched file(s) within the session's transcript set. */
  role: 'main' | 'subagent' | 'auxiliary';
  /** How the engine should sync matched file(s). */
  mode: 'jsonl-tail' | 'copy';
}

/**
 * Describes a live SQLite conversation database the engine should poll
 * read-only. The database is written by the host agent process (WAL mode);
 * the engine never writes to it. Per-row emission state lives in the
 * rebuildable sidecar at `sidecarPath`.
 */
export interface SqlitePollSourceSpec {
  /** Literal relative path of the conversation DB, relative to `watchRoot`. */
  pattern: string;
  /** Role of the source within the session's transcript set. */
  role: 'main' | 'subagent' | 'auxiliary';
  /** The read-only poll mode. */
  mode: 'sqlite-poll';
  /**
   * Expected conversation identity. Verified against the DB's
   * `trajectory_meta.cascade_id` at first read; mismatch is permanent
   * unavailability. Also pins the DB basename (`<conversationId>.db`).
   */
  conversationId: string;
  /**
   * Expected schema fingerprint (lowercase hex SHA-256 over the normalized
   * DDL of the required tables, in the adapter's pinned form). Verified at
   * first read and on every poll; mismatch/ambiguity is permanent
   * unavailability at attach, a named host-drift anomaly mid-stream.
   */
  schemaFingerprint: string;
  /**
   * Absolute path of the per-row emission-state sidecar — a rebuildable cache
   * derived by scanning the destination stream on attach; co-located with the
   * destination stream by the adapter's convention.
   */
  sidecarPath: string;
}

/** One source the engine should sync: a watched file or a polled database. */
export type SourceSpec = FileSourceSpec | SqlitePollSourceSpec;

/**
 * Runtime-agnostic description of a single agent session's transcript
 * sources, produced by a runtime adapter (see `./adapters/`) and consumed by
 * the transcript-sync engine.
 */
export interface SessionSyncManifest {
  /**
   * Manifest schema version. `1` — the file-based schema (`jsonl-tail`/`copy`
   * sources only). `2` — adds `sqlite-poll` sources (exactly one `main`
   * sqlite-poll source, no file sources alongside it). Unknown versions and
   * mode/version mismatches are rejected with named failures.
   */
  version: 1 | 2;
  /** Session identifier for stream file naming. */
  sessionId: string;
  /** Card identifier for sidecar metadata. */
  cardId: string;
  /** Open runtime identifier, e.g. `'claude-code'` or `'codex'`. */
  runtime: string;
  /** Open stream type identifier, e.g. `'claude-code-session'` or `'codex-session'`. */
  streamType: string;
  /** Absolute directory the sources below are resolved against. */
  watchRoot: string;
  /** Sources to watch within `watchRoot`. */
  sources: SourceSpec[];
  /** PID of the agent process this manifest's session belongs to. */
  monitorPid: number;
  /** Absolute path to the card repository. */
  cardRepoPath: string;
}

const VALID_ROLES = new Set<SourceSpec['role']>(['main', 'subagent', 'auxiliary']);
const VALID_MODES = new Set<SourceSpec['mode']>(['jsonl-tail', 'copy', 'sqlite-poll']);
const GLOB_METACHARACTERS = /[*?[{]/;

const TOP_LEVEL_KEYS = new Set<keyof SessionSyncManifest>([
  'version',
  'sessionId',
  'cardId',
  'runtime',
  'streamType',
  'watchRoot',
  'sources',
  'monitorPid',
  'cardRepoPath'
]);

/**
 * Thrown by {@link parseManifest} when the input is not a well-formed,
 * internally-consistent {@link SessionSyncManifest}. Validation is
 * fail-closed: any structural doubt throws rather than guessing.
 */
export class ManifestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ManifestValidationError';
  }
}

function fail(message: string): never {
  throw new ManifestValidationError(message);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isAbsolutePosixOrWinPath(value: string): boolean {
  // Accept POSIX absolute paths (`/...`) and Windows drive-absolute paths
  // (`C:\...` or `C:/...`); reject everything else, including UNC-relative
  // and bare relative segments.
  return value.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(value);
}

function validateSourcePattern(pattern: unknown, index: number): string {
  if (!isNonEmptyString(pattern)) {
    fail(`sources[${index}].pattern must be a non-empty string`);
  }
  if (pattern.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(pattern)) {
    fail(`sources[${index}].pattern must be relative to watchRoot, got absolute path: ${pattern}`);
  }
  if (pattern.includes('\\')) {
    fail(`sources[${index}].pattern must use forward slashes, got: ${pattern}`);
  }
  if (pattern.split('/').includes('..')) {
    fail(`sources[${index}].pattern must not contain ".." segments, got: ${pattern}`);
  }
  return pattern;
}

/**
 * Validates one `mode: 'sqlite-poll'` source body (conversation identity,
 * schema fingerprint, sidecar path). Version-2-only; the version/mode pairing
 * is enforced by the caller.
 *
 * @param raw - The raw source object.
 * @param index - Position of the source in `manifest.sources`.
 * @param pattern - The already-validated relative DB path.
 * @param role - The already-validated role.
 * @returns The validated {@link SqlitePollSourceSpec}.
 * @throws {ManifestValidationError} When any sqlite-poll field is missing,
 *   mistyped, or out of contract.
 */
function validateSqlitePollSource(
  raw: Record<string, unknown>,
  index: number,
  pattern: string,
  role: SourceSpec['role']
): SqlitePollSourceSpec {
  const conversationId = raw['conversationId'];
  if (!isNonEmptyString(conversationId)) {
    fail(`sources[${index}].conversationId must be a non-empty string`);
  }

  const schemaFingerprint = raw['schemaFingerprint'];
  if (typeof schemaFingerprint !== 'string' || !/^[0-9a-f]{64}$/.test(schemaFingerprint)) {
    fail(`sources[${index}].schemaFingerprint must be a lowercase hex SHA-256, got: ${String(schemaFingerprint)}`);
  }

  const sidecarPath = raw['sidecarPath'];
  if (!isNonEmptyString(sidecarPath) || !isAbsolutePosixOrWinPath(sidecarPath)) {
    fail(`sources[${index}].sidecarPath must be an absolute path, got: ${String(sidecarPath)}`);
  }

  return { pattern, role, mode: 'sqlite-poll', conversationId, schemaFingerprint, sidecarPath };
}

function validateSource(raw: unknown, index: number, version: 1 | 2): SourceSpec {
  if (typeof raw !== 'object' || raw === null) {
    fail(`sources[${index}] must be an object`);
  }
  const obj = raw as Record<string, unknown>;

  if (version !== 2 && obj['mode'] === 'sqlite-poll') {
    fail(`sources[${index}].mode 'sqlite-poll' requires manifest.version 2, got manifest.version ${version}`);
  }

  const fileKeys = new Set(['pattern', 'role', 'mode']);
  const sqliteKeys = new Set([...fileKeys, 'conversationId', 'schemaFingerprint', 'sidecarPath']);
  const allowedKeys = version === 2 ? sqliteKeys : fileKeys;
  for (const key of Object.keys(obj)) {
    if (!allowedKeys.has(key)) {
      fail(`sources[${index}] has unknown field: ${key}`);
    }
  }

  const pattern = validateSourcePattern(obj['pattern'], index);

  const rawRole = obj['role'];
  if (typeof rawRole !== 'string' || !VALID_ROLES.has(rawRole as SourceSpec['role'])) {
    fail(`sources[${index}].role must be one of 'main' | 'subagent' | 'auxiliary', got: ${String(rawRole)}`);
  }
  const role = rawRole as SourceSpec['role'];

  if (role === 'main' && GLOB_METACHARACTERS.test(pattern)) {
    fail(`sources[${index}] has role 'main' but its pattern contains glob metacharacters: ${pattern}`);
  }

  const rawMode = obj['mode'];
  if (typeof rawMode !== 'string' || !VALID_MODES.has(rawMode as SourceSpec['mode'])) {
    fail(`sources[${index}].mode must be one of 'jsonl-tail' | 'copy' | 'sqlite-poll', got: ${String(rawMode)}`);
  }
  const mode = rawMode as SourceSpec['mode'];

  if (mode === 'sqlite-poll') {
    if (version !== 2) {
      fail(`sources[${index}].mode 'sqlite-poll' requires manifest.version 2, got manifest.version ${version}`);
    }
    return validateSqlitePollSource(obj, index, pattern, role);
  }

  return { pattern, role, mode };
}

/**
 * Parses and validates a serialized {@link SessionSyncManifest}.
 *
 * Fails closed: throws {@link ManifestValidationError} on malformed JSON, any
 * missing/mistyped/unknown field, an invalid `version` (`1` or `2`; a
 * `sqlite-poll` source under version `1` is a named mode/version mismatch),
 * zero or more than one `role: 'main'` source, a `main` source pattern
 * containing glob metacharacters, a non-absolute `watchRoot`/`cardRepoPath`,
 * a source pattern that is absolute/contains `..`/uses backslashes, a
 * non-positive-integer `monitorPid`, or an empty
 * `sessionId`/`cardId`/`runtime`/`streamType`.
 *
 * @param json - Serialized manifest, typically produced by {@link serializeManifest}.
 * @returns The validated manifest.
 * @throws {ManifestValidationError} On any contract violation listed above.
 */
export function parseManifest(json: string): SessionSyncManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    fail(`manifest is not valid JSON: ${String(error)}`);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    fail('manifest must be a JSON object');
  }
  const obj = parsed as Record<string, unknown>;

  for (const key of Object.keys(obj)) {
    if (!TOP_LEVEL_KEYS.has(key as keyof SessionSyncManifest)) {
      fail(`manifest has unknown field: ${key}`);
    }
  }

  const version = obj['version'];
  if (version !== 1 && version !== 2) {
    fail(`manifest.version must be 1 or 2, got: ${String(version)}`);
  }

  const sessionId = obj['sessionId'];
  const cardId = obj['cardId'];
  const runtime = obj['runtime'];
  const streamType = obj['streamType'];
  const watchRoot = obj['watchRoot'];
  const cardRepoPath = obj['cardRepoPath'];
  const monitorPid = obj['monitorPid'];
  const sources = obj['sources'];

  if (!isNonEmptyString(sessionId)) fail('manifest.sessionId must be a non-empty string');
  if (!isNonEmptyString(cardId)) fail('manifest.cardId must be a non-empty string');
  if (!isNonEmptyString(runtime)) fail('manifest.runtime must be a non-empty string');
  if (!isNonEmptyString(streamType)) fail('manifest.streamType must be a non-empty string');

  if (!isNonEmptyString(watchRoot) || !isAbsolutePosixOrWinPath(watchRoot)) {
    fail(`manifest.watchRoot must be an absolute path, got: ${String(watchRoot)}`);
  }
  if (!isNonEmptyString(cardRepoPath) || !isAbsolutePosixOrWinPath(cardRepoPath)) {
    fail(`manifest.cardRepoPath must be an absolute path, got: ${String(cardRepoPath)}`);
  }

  if (typeof monitorPid !== 'number' || !Number.isInteger(monitorPid) || monitorPid <= 0) {
    fail(`manifest.monitorPid must be a positive integer, got: ${String(monitorPid)}`);
  }

  if (!Array.isArray(sources)) {
    fail('manifest.sources must be an array');
  }
  const validatedSources = sources.map((source, index) => validateSource(source, index, version));

  if (version === 2) {
    // A v2 manifest is homogeneous: exactly one source, the main sqlite-poll
    // one. Sub-trajectory topology is unwitnessed (the delegation witness is a
    // required fixture work item); lifting this rule needs that witness.
    const sqliteSources = validatedSources.filter((source) => source.mode === 'sqlite-poll');
    if (sqliteSources.length !== validatedSources.length || validatedSources.length !== 1) {
      fail(
        `a version-2 manifest must contain exactly one source and it must have mode 'sqlite-poll', found ${validatedSources.length} source(s) of which ${sqliteSources.length} are sqlite-poll`
      );
    }
  }

  const mainSources = validatedSources.filter((source) => source.role === 'main');
  if (mainSources.length !== 1) {
    fail(`manifest.sources must contain exactly one 'main' role source, found ${mainSources.length}`);
  }

  return {
    version,
    sessionId,
    cardId,
    runtime,
    streamType,
    watchRoot,
    sources: validatedSources,
    monitorPid,
    cardRepoPath
  };
}

/**
 * Serializes a {@link SessionSyncManifest} to JSON text.
 *
 * @param manifest - The manifest to serialize.
 * @returns JSON text, round-trippable through {@link parseManifest}.
 */
export function serializeManifest(manifest: SessionSyncManifest): string {
  return JSON.stringify(manifest);
}
