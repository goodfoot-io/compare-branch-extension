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
 * session's `watchRoot`.
 */
export interface SourceSpec {
  /** Literal path or glob, relative to `watchRoot`, using forward slashes. */
  pattern: string;
  /** Role of the matched file(s) within the session's transcript set. */
  role: 'main' | 'subagent' | 'auxiliary';
  /** How the engine should sync matched file(s). */
  mode: 'jsonl-tail' | 'copy';
}

/**
 * Runtime-agnostic description of a single agent session's transcript
 * sources, produced by a runtime adapter (see `./adapters/`) and consumed by
 * the transcript-sync engine.
 */
export interface SessionSyncManifest {
  /** Manifest schema version. Currently always `1`. */
  version: 1;
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
const VALID_MODES = new Set<SourceSpec['mode']>(['jsonl-tail', 'copy']);
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

function validateSource(raw: unknown, index: number): SourceSpec {
  if (typeof raw !== 'object' || raw === null) {
    fail(`sources[${index}] must be an object`);
  }
  const obj = raw as Record<string, unknown>;
  const allowedKeys = new Set(['pattern', 'role', 'mode']);
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
    fail(`sources[${index}].mode must be one of 'jsonl-tail' | 'copy', got: ${String(rawMode)}`);
  }
  const mode = rawMode as SourceSpec['mode'];

  return { pattern, role, mode };
}

/**
 * Parses and validates a serialized {@link SessionSyncManifest}.
 *
 * Fails closed: throws {@link ManifestValidationError} on malformed JSON, any
 * missing/mistyped/unknown field, an invalid `version`, zero or more than one
 * `role: 'main'` source, a `main` source pattern containing glob
 * metacharacters, a non-absolute `watchRoot`/`cardRepoPath`, a source pattern
 * that is absolute/contains `..`/uses backslashes, a non-positive-integer
 * `monitorPid`, or an empty `sessionId`/`cardId`/`runtime`/`streamType`.
 *
 * @param json - Serialized manifest, typically produced by {@link serializeManifest}.
 * @returns The validated manifest.
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
  if (version !== 1) {
    fail(`manifest.version must be 1, got: ${String(version)}`);
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
  const validatedSources = sources.map((source, index) => validateSource(source, index));

  const mainSources = validatedSources.filter((source) => source.role === 'main');
  if (mainSources.length !== 1) {
    fail(`manifest.sources must contain exactly one 'main' role source, found ${mainSources.length}`);
  }

  return {
    version: 1,
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
