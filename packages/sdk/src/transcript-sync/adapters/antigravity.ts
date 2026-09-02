/**
 * Antigravity runtime adapter for {@link SessionSyncManifest} construction
 * and conversation-DB payload decoding.
 *
 * The Antigravity host CLI (`agy`) writes each conversation to a WAL-mode
 * SQLite database at `~/.gemini/antigravity-cli/conversations/<conversationId>.db`
 * (witnessed live: notes/agy-live-witnesses.md). The session id is
 * Cards-generated and carried by `ANTIGRAVITY_SESSION_ID`; the conversation
 * identity is the DB basename. This adapter translates that layout into a
 * `sqlite-poll` manifest (schema version 2) and decodes `steps.step_payload`
 * under the witnessed formats — never guessing content.
 *
 * @summary Builds a sqlite-poll SessionSyncManifest and decodes Antigravity step payloads
 * @module
 */

import { createHash } from 'node:crypto';
import { basename, dirname, join } from 'node:path';
import type { SessionSyncManifest } from '../manifest.js';
import type { StepDecodeResult } from '../records.js';

/** Canonical stream type shared by the Antigravity hook, watcher, and renderer. */
export const ANTIGRAVITY_STREAM_TYPE = 'antigravity-session';

/** Input required to build an Antigravity {@link SessionSyncManifest}. */
export interface AntigravityManifestInput {
  /** Session identifier for stream file naming. */
  sessionId: string;
  /** Card identifier for sidecar metadata. */
  cardId: string;
  /** Absolute path to the conversation DB (`<conversationId>.db`). */
  transcriptPath: string;
  /** PID of the agent process to monitor. */
  monitorPid: number;
  /** Absolute path to the card repository. */
  cardRepoPath: string;
}

/**
 * The `steps.status` value that marks a row terminal (witnessed: all
 * completed rows reach status 3; observed non-terminal values 6/7 and any
 * unseen value are treated as non-terminal — tracked, then flushed as
 * named-partial at termination, never emitted as final content).
 */
export const ANTIGRAVITY_TERMINAL_STATUS = 3;

/**
 * The normalized DDL of the tables the adapter reads, pinned from the live
 * witness DB (`agy 1.1.23`, notes/agy-live-witnesses.md). The schema
 * fingerprint is computed over exactly these statements in this order;
 * normalized whitespace, then hashed. A DB whose DDL differs fails the
 * fingerprint verification.
 */
export const ANTIGRAVITY_SCHEMA_DDL: readonly string[] = [
  'CREATE TABLE `steps` (`idx` integer,`step_type` integer NOT NULL DEFAULT 0,`status` integer NOT NULL DEFAULT 0,`has_subtrajectory` numeric NOT NULL DEFAULT false,`metadata` blob,`error_details` blob,`permissions` blob,`task_details` blob,`render_info` blob,`step_payload` blob,`step_format` integer NOT NULL DEFAULT 0,PRIMARY KEY (`idx`))',
  'CREATE TABLE `trajectory_meta` (`trajectory_id` text,`cascade_id` text,`trajectory_type` integer,`source` integer,PRIMARY KEY (`trajectory_id`))'
];

/**
 * Computes the schema fingerprint for a list of DDL statements: whitespace is
 * normalized (collapses to single spaces, trimmed), the statements are joined
 * in the given order, and the result is hashed.
 *
 * @param ddl - DDL statements in pinned order.
 * @returns Lowercase hex SHA-256 of the normalized DDL text.
 */
export function computeSchemaFingerprint(ddl: readonly string[]): string {
  const normalized = ddl.map((statement) => statement.replace(/\s+/g, '').trim()).join('\n');
  return createHash('sha256').update(normalized, 'utf-8').digest('hex');
}

// --- Protobuf wire-format parsing (generic, validated) ---

interface ProtoField {
  fieldNumber: number;
  wireType: number;
  /** Varint value (wire type 0). */
  varint?: number;
  /** Length-delimited bytes (wire type 2). */
  bytes?: Uint8Array;
}

/**
 * Parses one protobuf message's wire fields. Handles wire types 0 (varint),
 * 1 (fixed64), 2 (length-delimited), and 5 (fixed32); group types (3/4) are
 * rejected — nothing in the witnessed payloads uses them.
 *
 * @param buffer - The message bytes.
 * @returns The parsed top-level fields in order, or `null` when the bytes are
 *   malformed (truncated, overlong tags, unknown wire type).
 */
function parseProtoFields(buffer: Uint8Array): ProtoField[] | null {
  const fields: ProtoField[] = [];
  let offset = 0;
  const readVarint = (): number | null => {
    // Varints may be up to 10 bytes (64-bit values). The numeric value is
    // never consumed for content (text fields are wire type 2), so precision
    // beyond 32 bits is acceptable — only structural validity matters here.
    let result = 0;
    let shift = 0;
    let bytes = 0;
    for (;;) {
      if (offset >= buffer.length || bytes >= 10) return null;
      const byte: number = buffer[offset]!;
      offset += 1;
      bytes += 1;
      if (shift <= 28) result |= (byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) return result >>> 0;
      shift += 7;
    }
  };
  while (offset < buffer.length) {
    const tag = readVarint();
    if (tag === null) return null;
    const fieldNumber = tag >>> 3;
    const wireType = tag & 0x07;
    if (fieldNumber === 0) return null;
    if (wireType === 0) {
      const varint = readVarint();
      if (varint === null) return null;
      fields.push({ fieldNumber, wireType, varint });
    } else if (wireType === 1) {
      if (offset + 8 > buffer.length) return null;
      offset += 8;
      fields.push({ fieldNumber, wireType });
    } else if (wireType === 2) {
      const length = readVarint();
      if (length === null || offset + length > buffer.length) return null;
      fields.push({ fieldNumber, wireType, bytes: buffer.subarray(offset, offset + length) });
      offset += length;
    } else if (wireType === 5) {
      if (offset + 4 > buffer.length) return null;
      offset += 4;
      fields.push({ fieldNumber, wireType });
    } else {
      return null;
    }
  }
  return fields;
}

/**
 * First length-delimited field with the given number, or `null`.
 *
 * @param fields - The parsed message fields.
 * @param fieldNumber - The proto field number to look up.
 * @returns The field's bytes, or `null` when absent.
 */
function firstLengthDelimited(fields: ProtoField[], fieldNumber: number): Uint8Array | null {
  return fields.find((f) => f.fieldNumber === fieldNumber && f.bytes !== undefined)?.bytes ?? null;
}

/**
 * Decodes bytes as strict UTF-8 text. Returns `null` for invalid UTF-8, empty
 * text, or text containing control characters other than newline/tab/carriage
 * return — a validated text field must read as natural text, never binary.
 *
 * @param bytes - The candidate text bytes.
 * @returns The decoded text, or `null` when the bytes are not validated text.
 */
function decodeValidatedText(bytes: Uint8Array): string | null {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (text.length === 0) return null;
    for (const ch of text) {
      const code = ch.codePointAt(0)!;
      const allowedWhitespace = code === 0x09 || code === 0x0a || code === 0x0d;
      if ((code < 0x20 && !allowedWhitespace) || code === 0x7f) return null;
    }
    return text;
  } catch {
    return null;
  }
}

function anomaly(detail: string): StepDecodeResult {
  return { kind: 'anomaly', detail };
}

/**
 * Decodes one `steps` row payload into record content.
 *
 * Witnessed format: `step_format` 0 — protobuf-like wire bytes; the decoder
 * parses the wire format generically and extracts content through per-
 * `step_type` validated field paths (user/assistant text; tool-call
 * name + arguments JSON), validating strict UTF-8 and structure at every
 * step. Anything outside the witnessed contract — an unknown `step_format`,
 * an unwitnessed `step_type`, malformed wire bytes, invalid UTF-8 — returns
 * an anomaly result with a deterministic detail; the decoder never emits
 * guessed content.
 *
 * @param stepType - Source `steps.step_type`.
 * @param stepFormat - Source `steps.step_format` selector.
 * @param payload - Source `steps.step_payload` bytes (may be `null`).
 * @returns The decoded content, or a named anomaly with detail.
 */
export function decodeStepPayload(stepType: number, stepFormat: number, payload: Uint8Array | null): StepDecodeResult {
  if (stepFormat !== 0) {
    return anomaly(`unwitnessed step_format ${String(stepFormat)} on step_type ${String(stepType)}`);
  }
  if (payload === null || payload.length === 0) {
    return anomaly(`missing step_payload on step_type ${String(stepType)}`);
  }
  const fields = parseProtoFields(payload);
  if (fields === null) {
    return anomaly(`malformed protobuf wire bytes on step_type ${String(stepType)}`);
  }

  if (stepType === 14) {
    // Witnessed user-prompt path: outer field 19 wraps the user-content
    // message whose field 2 carries the prompt text (witnessed on the live
    // 1.1.23 probe rows: path [19, 2]).
    const userContent = firstLengthDelimited(fields, 19);
    if (userContent === null) return anomaly('missing user-content field (19) on step_type 14');
    const innerFields = parseProtoFields(userContent);
    if (innerFields === null) return anomaly('malformed user-content message on step_type 14');
    const text = decodeValidatedText(firstLengthDelimited(innerFields, 2) ?? new Uint8Array());
    if (text === null) return anomaly('undecodable user text on step_type 14');
    return { kind: 'ok', content: text };
  }

  if (stepType === 15) {
    // Witnessed assistant-response path: outer field 20 wraps an inner
    // message whose field 1 carries the response text.
    const inner = firstLengthDelimited(fields, 20);
    if (inner === null) return anomaly('missing response field (20) on step_type 15');
    const innerFields = parseProtoFields(inner);
    if (innerFields === null) return anomaly('malformed inner message on step_type 15');
    const text = decodeValidatedText(firstLengthDelimited(innerFields, 1) ?? new Uint8Array());
    if (text === null) return anomaly('undecodable assistant text on step_type 15');
    return { kind: 'ok', content: text };
  }

  if (stepType === 132) {
    // Witnessed tool-invocation path: outer field 5 wraps the tool message
    // whose field 4 carries {field 1: call id, field 2: tool name, field 3:
    // arguments JSON} (witnessed on the live 1.1.23 run_command row: path
    // [5, 4, {1, 2, 3}]). Content is the canonical tool JSON.
    const toolEnvelope = firstLengthDelimited(fields, 5);
    if (toolEnvelope === null) return anomaly('missing tool envelope field (5) on step_type 132');
    const envelopeFields = parseProtoFields(toolEnvelope);
    if (envelopeFields === null) return anomaly('malformed tool envelope message on step_type 132');
    const invocation = firstLengthDelimited(envelopeFields, 4);
    if (invocation === null) return anomaly('missing tool invocation field (5.4) on step_type 132');
    const invocationFields = parseProtoFields(invocation);
    if (invocationFields === null) return anomaly('malformed tool invocation message on step_type 132');
    const toolName = decodeValidatedText(firstLengthDelimited(invocationFields, 2) ?? new Uint8Array());
    if (toolName === null) return anomaly('undecodable tool name on step_type 132');
    const argsBytes = firstLengthDelimited(invocationFields, 3);
    if (argsBytes === null) return anomaly('missing tool arguments on step_type 132');
    const argsText = decodeValidatedText(argsBytes);
    if (argsText === null) return anomaly('undecodable tool arguments on step_type 132');
    let args: unknown;
    try {
      args = JSON.parse(argsText);
    } catch {
      return anomaly('tool arguments are not valid JSON on step_type 132');
    }
    return { kind: 'ok', content: JSON.stringify({ tool: toolName, arguments: args ?? null }) };
  }

  return anomaly(`unwitnessed step_type ${String(stepType)}`);
}

/**
 * Builds a {@link SessionSyncManifest} for an Antigravity session: schema
 * version 2 with a single `sqlite-poll` main source whose DB path is
 * `transcriptPath`.
 *
 * Fails closed: `transcriptPath`'s basename must be exactly
 * `<conversationId>.db` — the conversation id is the DB basename, and a
 * caller supplying a path that disagrees indicates a wiring bug upstream that
 * must not be silently reconciled. The manifest carries the expected schema
 * fingerprint (computed from {@link ANTIGRAVITY_SCHEMA_DDL}) and a sidecar
 * path co-located with the destination stream.
 *
 * @param input - Session identifiers and paths (the DB path arrives as
 *   `transcriptPath`).
 * @returns A schema-version-2 manifest describing the polled conversation DB.
 * @throws {Error} When `transcriptPath`'s basename is not `<conversationId>.db`
 *   or the basename is empty.
 */
export function buildAntigravityManifest(input: AntigravityManifestInput): SessionSyncManifest {
  const { sessionId, cardId, transcriptPath, monitorPid, cardRepoPath } = input;

  const actualBasename = basename(transcriptPath);
  if (!actualBasename.endsWith('.db')) {
    throw new Error(
      `Antigravity transcriptPath basename "${actualBasename}" must be the conversation DB ("<conversationId>.db")`
    );
  }
  const conversationId = actualBasename.slice(0, -'.db'.length);
  if (conversationId.length === 0) {
    throw new Error(`Antigravity transcriptPath basename "${actualBasename}" has an empty conversation id`);
  }

  const pattern = actualBasename;
  const streamType = ANTIGRAVITY_STREAM_TYPE;
  return {
    version: 2,
    sessionId,
    cardId,
    runtime: 'antigravity',
    streamType,
    watchRoot: dirname(transcriptPath),
    sources: [
      {
        pattern,
        role: 'main',
        mode: 'sqlite-poll',
        conversationId,
        schemaFingerprint: computeSchemaFingerprint(ANTIGRAVITY_SCHEMA_DDL),
        sidecarPath: join(cardRepoPath, 'streams', streamType, `${pattern}.emission-state.json`)
      }
    ],
    monitorPid,
    cardRepoPath
  };
}
