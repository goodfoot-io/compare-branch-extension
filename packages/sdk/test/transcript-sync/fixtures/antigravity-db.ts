/**
 * Antigravity conversation-DB test fixtures.
 *
 * Creates real SQLite conversation databases with the pinned schema
 * ({@link ANTIGRAVITY_SCHEMA_DDL}) via `node:sqlite`, inserts `steps` rows,
 * and builds `step_format` 0 protobuf-wire payloads independently of the
 * decoder under test (the decoder must parse these, not share code with
 * them). Also embeds the three real payloads captured from live witness DBs
 * (notes/agy-live-witnesses.md) as base64.
 *
 * @summary Antigravity conversation-DB and payload fixtures
 * @module
 */

import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { ANTIGRAVITY_SCHEMA_DDL } from '../../../src/transcript-sync/adapters/antigravity.js';

/** A minimal writable handle around a fixture conversation DB. */
export interface FixtureConversationDb {
  /** Path of the `.db` file. */
  path: string;
  /** Raw node:sqlite handle (writable) for driving host-side mutations. */
  db: DatabaseSync;
  /** Inserts one `steps` row (upsert semantics: replaces on same idx). */
  insertStep(row: { idx: number; stepType: number; status: number; payload: Uint8Array | null; format: number }): void;
  /** Sets `trajectory_meta` to a single row with the given cascade id. */
  setTrajectoryMeta(cascadeId: string): void;
  /** Closes the handle. */
  close(): void;
}

/**
 * Creates an empty conversation DB with the exact pinned schema.
 *
 * @param dir - Directory for the `<conversationId>.db` file.
 * @param conversationId - Conversation id; the DB basename is `<id>.db`.
 * @returns A writable fixture handle.
 */
export function createConversationDb(dir: string, conversationId: string): FixtureConversationDb {
  const dbPath = join(dir, `${conversationId}.db`);
  const db = new DatabaseSync(dbPath);
  for (const ddl of ANTIGRAVITY_SCHEMA_DDL) {
    db.exec(ddl);
  }
  return {
    path: dbPath,
    db,
    insertStep(row: {
      idx: number;
      stepType: number;
      status: number;
      payload: Uint8Array | null;
      format: number;
    }): void {
      db.prepare(
        'INSERT OR REPLACE INTO steps (idx, step_type, status, has_subtrajectory, step_payload, step_format) VALUES (?, ?, ?, 0, ?, ?)'
      ).run(row.idx, row.stepType, row.status, row.payload === null ? null : Buffer.from(row.payload), row.format);
    },
    setTrajectoryMeta(cascadeId: string): void {
      db.exec('DELETE FROM trajectory_meta');
      db.prepare(
        'INSERT INTO trajectory_meta (trajectory_id, cascade_id, trajectory_type, source) VALUES (?, ?, 4, 17)'
      ).run(`traj-for-${cascadeId}`, cascadeId);
    },
    close(): void {
      db.close();
    }
  };
}

// --- Independent protobuf wire-format builders (test-side only) ---

function encodeVarint(value: number): Buffer {
  const bytes: number[] = [];
  let v = value;
  do {
    let byte = v & 0x7f;
    v >>>= 7;
    if (v > 0) byte |= 0x80;
    bytes.push(byte);
  } while (v > 0);
  return Buffer.from(bytes);
}

function encodeField(fieldNumber: number, wireType: number, body: Buffer): Buffer {
  return Buffer.concat([encodeVarint((fieldNumber << 3) | wireType), body]);
}

function encodeLengthDelimited(fieldNumber: number, payload: Buffer): Buffer {
  return encodeField(fieldNumber, 2, Buffer.concat([encodeVarint(payload.length), payload]));
}

function encodeText(fieldNumber: number, text: string): Buffer {
  return encodeLengthDelimited(fieldNumber, Buffer.from(text, 'utf-8'));
}

/**
 * Builds a type-14 (user prompt) payload with the witnessed nesting: outer
 * field 19 wraps the user-content message whose field 2 carries the prompt
 * text (live path [19, 2]), plus decoy fields to prove extraction picks the
 * pinned path.
 *
 * @param text - The user prompt text.
 * @returns fmt-0 payload bytes.
 */
export function buildUserPayload(text: string): Buffer {
  return Buffer.concat([
    encodeLengthDelimited(19, Buffer.concat([encodeText(2, text), encodeText(4, `decoy:${text}`)])),
    encodeText(9, `decoy-outer:${text}`)
  ]);
}

/**
 * Builds a type-15 (assistant response) payload: outer field 20 wraps an
 * inner message whose field 1 carries the response text (witnessed path),
 * plus a decoy outer field.
 *
 * @param text - The assistant response text.
 * @returns fmt-0 payload bytes.
 */
export function buildAssistantPayload(text: string): Buffer {
  const inner = Buffer.concat([encodeText(1, text), encodeText(6, `decoy-inner:${text}`)]);
  return Buffer.concat([encodeLengthDelimited(20, inner), encodeText(9, `decoy-outer:${text}`)]);
}

/**
 * Builds a type-132 (tool invocation) payload with the witnessed nesting:
 * outer field 5 wraps the tool envelope whose field 4 carries field 1 call
 * id, field 2 tool name, field 3 arguments JSON (live path
 * [5, 4, {1, 2, 3}]), plus an unrelated binary field.
 *
 * @param callId - Tool call id, e.g. `call_226020`.
 * @param toolName - Tool name, e.g. `run_command`.
 * @param argsJson - Tool arguments as a JSON string.
 * @returns fmt-0 payload bytes.
 */
export function buildToolPayload(callId: string, toolName: string, argsJson: string): Buffer {
  const invocation = Buffer.concat([
    encodeText(1, callId),
    encodeText(2, toolName),
    encodeLengthDelimited(3, Buffer.from(argsJson, 'utf-8')),
    encodeLengthDelimited(9, Buffer.from([0x00, 0xff, 0x00, 0xfe]))
  ]);
  return encodeLengthDelimited(5, Buffer.concat([encodeLengthDelimited(4, invocation)]));
}

/**
 * Real `step_payload` bytes captured from the live witness conversation DBs
 * (notes/agy-live-witnesses.md, agy 1.1.23), base64-encoded:
 * idx 0 user prompt "Reply with exactly: PONG", idx 1 assistant response
 * "PONG", and the type-132 `run_command` row that printed
 * ANTIGRAVITY_SESSION_ID.
 */
export const REAL_PAYLOADS = {
  userPong:
    'CA4gAyqZAQoMCNbh2dQGEIvn+boDGARiJDY5ODdiMjkxLWI3ODMtNDg2NC05ZTFiLTJjMTQxYjhhNjc3ZqIBTAokMzk4OGRkYWMtNzlhZi00ZjMwLWFhNTQtNTMyZTAzY2YyZjgzIiQ4NzI0Y2Q5OC02YjA3LTQwODAtODJkMy0xYzYxN2JlMjM2YmbSAREKDwgDEgsI1+HZ1AYQmf/vB5oBjgoSGFJlcGx5IHdpdGggZXhhY3RseTogUE9ORxoaChhSZXBseSB3aXRoIGV4YWN0bHk6IFBPTkciAGLICQrACWonQgYaAjABeADSAhcKAggBEgAaDxoNd3JpdGVfZmlsZSgvKbIDAggAegMIkwrSAlV6TgpMEAEaKxopL2hvbWUvbm9kZS8uZ2VtaW5pL2FudGlncmF2aXR5LWNsaS9za2lsbHMaGxoZL2hvbWUvbm9kZS8uZ2VtaW5pL3NraWxsc4gBAVoAmAMAygN1CicqEmFneS1jdXN0b21pemF0aW9ucyoRYW50aWdyYXZpdHlfZ3VpZGUSSggBEgRzZWxmEghyZXNlYXJjaBIHYnJvd3NlchIQdGVhbXdvcmtfcHJldmlldxIJRGVlcENvZGVyEhBEZWVwSW52ZXN0aWdhdG9y8gK7BxIKEghpZGVudGl0eRISEhB1c2VyX2luZm9ybWF0aW9uEg0SC21jcF9zZXJ2ZXJzEgwSCnVzZXJfcnVsZXMSCBIGc2tpbGxzEgsSCXN1YmFnZW50cxITEhFzdWJhZ2VudF9yZW1pbmRlchILEgltZXNzYWdpbmcSGRIXY29udmVyc2F0aW9uX3RyYW5zY3JpcHQSCxIJYXJ0aWZhY3RzEhASDnNsYXNoX2NvbW1hbmRzEhISEHRlcm1pbmFsX3NhbmRib3gSDBIKZ3VpZGVsaW5lcxIVEhNjb21tdW5pY2F0aW9uX3N0eWxlGg0KCXZpZXdfZmlsZRABGg8KC3J1bl9jb21tYW5kEAEaDwoLbWFuYWdlX3Rhc2sQARoQCgxzZW5kX21lc3NhZ2UQARoMCghzY2hlZHVsZRABGhMKD2ludm9rZV9zdWJhZ2VudBABGhMKD2RlZmluZV9zdWJhZ2VudBABGhQKEG1hbmFnZV9zdWJhZ2VudHMQARoRCg13cml0ZV90b19maWxlEAEaGAoUcmVwbGFjZV9maWxlX2NvbnRlbnQQARoSCg5nZW5lcmF0ZV9pbWFnZRABGhQKEHJlYWRfdXJsX2NvbnRlbnQQARoOCgpzZWFyY2hfd2ViEAEaEAoMZmluZF9ieV9uYW1lEAEaDwoLZ3JlcF9zZWFyY2gQARoMCghsaXN0X2RpchABGhAKDGFza19xdWVzdGlvbhABIhQKEG1lc3NhZ2VfZGVsaXZlcnkQASITCg9jb250ZXh0X3N1bW1hcnkQASoaChZtZXNzYWdlX2NvbnRpbnVlX2NoZWNrEAEqFwoTdGVybWluYWxfc3RlcF9jaGVjaxABKiMKH21heF9nZW5lcmF0b3JfaW52b2NhdGlvbnNfY2hlY2sQASojCh9lbXB0eV9vdXRwdXRfY29udGludWF0aW9uX2NoZWNrEAEqFAoQZm9yY2VfaW52b2NhdGlvbhABKhYKEm5vX3Rvb2xfY2FsbF9jaGVjaxABMhkKFWJhdHRsZV9tb2RlX3Rvb2xfYXJncxABMicKI3RpbWVvdXRfbG9uZ19ydW5uaW5nX3NlYXJjaF9jb21tYW5kEAFCIgoecmVxdWVzdF9hcnRpZmFjdF9mZWVkYmFja19zdG9wEAFCDQoJZ29hbF9zdG9wEAFCFwoTaWRsZV9zdWJhZ2VudF9ndWFyZBABUAFaFQoRb3V0cHV0X3RydW5jYXRpb24QAVoUChBhdWdtZW50ZWRfaW50ZW50EAEaA4gBAZIBCBoGCgQIABgB',
  assistantPong:
    'CA8gAyrcAgoLCNfh2dQGEOPpgBMYAjIMCNjh2dQGEOOLj6IDOgwI2OHZ1AYQg+S4xANCDAjY4dnUBhCD5LjEA0pyCJMKEM1sGAIwGDooYm90LTJmZTY0MTk5LWUyMDctNDIzMS1hYzJhLWNiZTNlZDY4YmM0M0IhCglzZXNzaW9uSUQSFC0zNzUwNzYzMDM0MzYyODk1NTc5UAJaFzEzQ1dhdlBZRVpHNl91TVA2b0t5LUF3WJMKYiQ2OTg3YjI5MS1iNzgzLTQ4NjQtOWUxYi0yYzE0MWI4YTY3N2aiAU4KJDM5ODhkZGFjLTc5YWYtNGYzMC1hYTU0LTUzMmUwM2NmMmY4MxABIiQ4NzI0Y2Q5OC02YjA3LTQwODAtODJkMy0xYzYxN2JlMjM2YmbSASMKDwgIEgsI1+HZ1AYQ8ZyBEwoQCAMSDAjY4dnUBhCTr7rEA4ICDAjY4dnUBhCD5LjEA6IBowEKBFBPTkcyKGJvdC0yZmU2NDE5OS1lMjA3LTQyMzEtYWMyYS1jYmUzZWQ2OGJjNDNCBFBPTkdgAnJpEmcKZQERTTIPrEC2m/kHkXIKHjH74n05K/2tOSngvsAU74VqySNcxHAdLWOCnTmQN03Qr8mLijycCU6BIpmZIyeFZONfocW7Kq1ZBCX+nQU+Rx03YXiZAwrMLPhg+XQcQtBt1a/oUYFe',
  toolPrintenv:
    'CIQBIAMqsAgKDAj4+NnUBhCo6t3FARgCIqcGCgtjYWxsXzIyNjAyMBILcnVuX2NvbW1hbmQa1QF7IkNvbW1hbmRMaW5lIjoicHJpbnRlbnYgQU5USUdSQVZJVFlfU0VTU0lPTl9JRCIsIkN3ZCI6Ii9ob21lL25vZGUvLmdlbWluaS9hbnRpZ3Jhdml0eS1jbGkvc2NyYXRjaCIsIldhaXRNc0JlZm9yZUFzeW5jIjo1MDAwLCJ0b29sQWN0aW9uIjoiUnVubmluZyBwcmludGVudiBjb21tYW5kIiwidG9vbFN1bW1hcnkiOiJQcmludGVudiBBTlRJR1JBVklUWV9TRVNTSU9OX0lEIn06sgQSrwQKrAQBEU0yDzHCG+xDiDHlf2VGo9VYCBACL2zaofnL28wT4YN29K+o5Xajvc2WVL3biBSMf4rY3RHH4nDESQHbtD3bvcE56uyxBhcqgBQwLD9LNTmCbg2ZzX+ir3AiF2eH90s83QQIoMkImq+ypLgYSbCOS5CP1UPu7oe1E8TSZbhQRKeOBWfLNWYy+FHxOrFT1qWuLXeXJdeIpOa/H1Xl1LXYrn6I9rNSZ2GoGm3/mJEW4bA/xbgdjQJ0uCQgWY309m2+95+oEdT4xGJFadYtghqdj95/GPrTOMEPX4n57iqIctkf8jQfOnuM4VlVeMot/qa0ZPIE6IyVIWIAEZGbzaDr3EWXm7DsQ29UJ6VwfTEHKGKau4BhRreI0JAu3elcfIIcdfA+Dh4XaU398HhgBiihCQYZ4RAUZV6N9ORxvH7QQb+moM/pCEt5v0a3499C1glDFVdBg1WwroK3EoKo720L8zdqRPcGJ92Ii+Ha/hYmb7IsJDWKM8ZXu8+LOoIzQmu/t7H3eBKYjE3Z6/hwfciC6slW5eCr3tfzYetdhRmQ+KHkhwcI0cpeOfrIV66nWPy4HVVIvo9eSYi0nauMRmwjGG08XuYmoIW2tXeJsoxT90FJohH19aLiQCpyWluHHCAa49cB2/iFXIfaTTSn2MA0hdhpoHe9Lme3mhg41dCfq2B0YQk468VCxptOScMBp6ASsORRASxlJGtiI6rxAxZaq432ZG6vSM1Ps5tvMgwI+PjZ1AYQg+LnxwE6DAj4+NnUBhCD4ufHAUIMCPj42dQGEPvP59EBWJMKYiQ2NTQ0OWExMi1jMWUwLTQwMjYtYmZiMy1jMWZiNDkxNTFhODiiAU4KJGFlYmFlYmYzLTJhMDMtNGY1NS04MjcxLWY2MGRmMGY0ZTRiORACIiQyYmQ1N2Q5MC1hYjFkLTQ0ZmUtYWM0MC0zM2UyMWE2OTk2ODnSATYKEAgBEgwI+PjZ1AYQ2s3pxwEKEAgCEgwI+PjZ1AYQ3cC3yAEKEAgDEgwI+PjZ1AYQ2MTq0QGCAgwI+PjZ1AYQxaygyAGSAgciBWFsbG934gjGDQoZChFXYWl0TXNCZWZvcmVBc3luYxIENTAwMAomCgp0b29sQWN0aW9uEhhSdW5uaW5nIHByaW50ZW52IGNvbW1hbmQKLgoLdG9vbFN1bW1hcnkSH1ByaW50ZW52IEFOVElHUkFWSVRZX1NFU1NJT05fSUQKLgoLQ29tbWFuZExpbmUSH3ByaW50ZW52IEFOVElHUkFWSVRZX1NFU1NJT05fSUQKMQoDQ3dkEiovaG9tZS9ub2RlLy5nZW1pbmkvYW50aWdyYXZpdHktY2xpL3NjcmF0Y2gS7QsKQgpUaGUgY29tbWFuZCBleGl0ZWQgd2l0aCBjb2RlIDAuCk91dHB1dDoKd2l0bmVzcy1zZXNzaW9uLWFiYzEyMw0KCjKrCgoldHlwZS5nb29nbGVhcGlzLmNvbS9nZW1pbmlfY29kZXIuU3RlcBKBCggVIAMq2wgKDAj4+NnUBhCo6t3FARgCIqcGCgtjYWxsXzIyNjAyMBILcnVuX2NvbW1hbmQa1QF7IkNvbW1hbmRMaW5lIjoicHJpbnRlbnYgQU5USUdSQVZJVFlfU0VTU0lPTl9JRCIsIkN3ZCI6Ii9ob21lL25vZGUvLmdlbWluaS9hbnRpZ3Jhdml0eS1jbGkvc2NyYXRjaCIsIldhaXRNc0JlZm9yZUFzeW5jIjo1MDAwLCJ0b29sQWN0aW9uIjoiUnVubmluZyBwcmludGVudiBjb21tYW5kIiwidG9vbFN1bW1hcnkiOiJQcmludGVudiBBTlRJR1JBVklUWV9TRVNTSU9OX0lEIn06sgQSrwQKrAQBEU0yDzHCG+xDiDHlf2VGo9VYCBACL2zaofnL28wT4YN29K+o5Xajvc2WVL3biBSMf4rY3RHH4nDESQHbtD3bvcE56uyxBhcqgBQwLD9LNTmCbg2ZzX+ir3AiF2eH90s83QQIoMkImq+ypLgYSbCOS5CP1UPu7oe1E8TSZbhQRKeOBWfLNWYy+FHxOrFT1qWuLXeXJdeIpOa/H1Xl1LXYrn6I9rNSZ2GoGm3/mJEW4bA/xbgdjQJ0uCQgWY309m2+95+oEdT4xGJFadYtghqdj95/GPrTOMEPX4n57iqIctkf8jQfOnuM4VlVeMot/qa0ZPIE6IyVIWIAEZGbzaDr3EWXm7DsQ29UJ6VwfTEHKGKau4BhRreI0JAu3elcfIIcdfA+Dh4XaU398HhgBiihCQYZ4RAUZV6N9ORxvH7QQb+moM/pCEt5v0a3499C1glDFVdBg1WwroK3EoKo720L8zdqRPcGJ92Ii+Ha/hYmb7IsJDWKM8ZXu8+LOoIzQmu/t7H3eBKYjE3Z6/hwfciC6slW5eCr3tfzYetdhRmQ+KHkhwcI0cpeOfrIV66nWPy4HVVIvo9eSYi0nauMRmwjGG08XuYmoIW2tXeJsoxT90FJohH19aLiQCpyWluHHCAa49cB2/iFXIfaTTSn2MA0hdhpoHe9Lme3mhg41dCfq2B0YQk468VCxptOScMBp6ASsORRASxlJGtiI6rxAxZaq432ZG6vSM1Ps5tvMgwI+PjZ1AYQg+LnxwE6DAj4+NnUBhCD4ufHAUIMCPj42dQGEOjA/9ABWJMKYiQ2NTQ0OWExMi1jMWUwLTQwMjYtYmZiMy1jMWZiNDkxNTFhODiiAU4KJGFlYmFlYmYzLTJhMDMtNGY1NS04MjcxLWY2MGRmMGY0ZTRiORACIiQyYmQ1N2Q5MC1hYjFkLTQ0ZmUtYWM0MC0zM2UyMWE2OTk2ODnSASQKEAgBEgwI+PjZ1AYQ2s3pxwEKEAgCEgwI+PjZ1AYQ3cC3yAHyAR9QcmludGVudiBBTlRJR1JBVklUWV9TRVNTSU9OX0lE+gEYUnVubmluZyBwcmludGVudiBjb21tYW5kggIMCPj42dQGEMWsoMgBkgIHIgVhbGxvd+IBmwESKi9ob21lL25vZGUvLmdlbWluaS9hbnRpZ3Jhdml0eS1jbGkvc2NyYXRjaDAAWAFgiCeqARoKGHdpdG5lc3Mtc2Vzc2lvbi1hYmMxMjMNCroBH3ByaW50ZW52IEFOVElHUkFWSVRZX1NFU1NJT05fSUTKAR9wcmludGVudiBBTlRJR1JBVklUWV9TRVNTSU9OX0lE+gEEYmFzaDp5ZmlsZTovLy9ob21lL25vZGUvLmdlbWluaS9hbnRpZ3Jhdml0eS1jbGkvYnJhaW4vMmJkNTdkOTAtYWIxZC00NGZlLWFjNDAtMzNlMjFhNjk5Njg5Ly5zeXN0ZW1fZ2VuZXJhdGVkL3N0ZXBzLzIvb3V0cHV0LnR4dA=='
} as const;
