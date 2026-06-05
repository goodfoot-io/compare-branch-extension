/**
 * Defensive parser for Codex rollout JSONL lines.
 *
 * Each persisted rollout line is a UTC `timestamp` flattened together with a
 * `RolloutItem` (see `third_party/reference/codex/codex-rs/protocol/src/protocol.rs`
 * L2843-L2851), tagged by a snake_case `type` discriminator with the item body
 * under `payload`. The parser validates the root envelope without requiring any
 * nested payload field: unknown root types and unknown nested response/event
 * variants fall through to readable raw forms, and malformed JSONL is preserved
 * verbatim so the rest of the transcript survives a single bad line.
 *
 * All Rust `Option<T>` fields are modeled as `T | undefined`. Types are derived
 * from `protocol.rs` and `models.rs` at tag `rust-v0.137.0`.
 *
 * @summary Parses a Codex rollout JSONL line into a discriminated union
 * @module streams/codex-session/www/lib/parser
 */

/**
 * A single content item inside a `ResponseItem::Message` (`models.rs` L703-L716).
 *
 * `input_text` / `output_text` carry plain text; `input_image` carries an image
 * URL and optional detail hint. Text extraction concatenates the text variants.
 */
export type ContentItem =
  | { type: 'input_text'; text: string }
  | { type: 'output_text'; text: string }
  | { type: 'input_image'; image_url: string; detail?: 'auto' | 'low' | 'high' | 'original' }
  | { type: string; [key: string]: unknown };

/**
 * Output payload for `function_call_output` / `custom_tool_call_output`
 * (`models.rs` L808-L842). On the wire this is either a plain string or an array
 * of structured content items; both shapes must be handled without throwing on
 * the other.
 */
export type FunctionCallOutput = string | ContentItem[];

/**
 * Optional assistant-message phase (`models.rs` L735). Providers do not emit
 * this consistently, so it is never used as a reliable discriminator.
 */
export type MessagePhase = 'commentary' | 'final_answer';

/**
 * Discriminated union over the `payload.type` of a `response_item` line.
 *
 * Covers the presentation-relevant variants of `ResponseItem` (`models.rs`
 * L745-L898). Unknown future variants are caught by the open-ended final member
 * so the transcript can render a raw fallback rather than throwing.
 */
export type ResponseItemPayload =
  | { type: 'message'; role: string; content: ContentItem[]; phase?: MessagePhase }
  | { type: 'reasoning'; summary: unknown[]; content?: unknown[]; encrypted_content?: string }
  | { type: 'local_shell_call'; call_id?: string; status: string; action: unknown }
  | { type: 'function_call'; name: string; namespace?: string; arguments: string; call_id: string }
  | { type: 'function_call_output'; call_id: string; output: FunctionCallOutput }
  | { type: 'custom_tool_call'; status?: string; call_id: string; name: string; input: string }
  | { type: 'custom_tool_call_output'; call_id: string; name?: string; output: FunctionCallOutput }
  | { type: 'tool_search_call'; call_id?: string; status?: string; execution: string; arguments: unknown }
  | { type: 'tool_search_output'; call_id?: string; status: string; execution: string; tools: unknown[] }
  | { type: 'web_search_call'; status?: string; action?: unknown }
  | { type: 'image_generation_call'; id: string; status: string; revised_prompt?: string; result: string }
  | { type: 'compaction'; encrypted_content: string }
  | { type: 'compaction_trigger' }
  | { type: 'context_compaction'; encrypted_content?: string }
  | { type: string; [key: string]: unknown };

/**
 * Session metadata payload for a `session_meta` line (`protocol.rs` L2835-L2841).
 *
 * Flattens `SessionMeta` together with optional git info. All fields are
 * treated as optional context — present-only header/context information, never
 * proof that a session or turn succeeded.
 */
export interface SessionMetaPayload {
  id?: string;
  timestamp?: string;
  cwd?: string;
  originator?: string;
  cli_version?: string;
  source?: string;
  model?: string;
  model_provider_id?: string;
  git?: unknown;
  [key: string]: unknown;
}

/**
 * Compaction marker payload for a `compacted` line (`protocol.rs` L2853-L2858).
 *
 * `message` is the human-readable summary; `replacement_history` optionally
 * re-establishes context after mid-turn compaction.
 */
export interface CompactedPayload {
  message: string;
  replacement_history?: ResponseItemPayload[];
}

/**
 * Durable per-turn context baseline for a `turn_context` line (`protocol.rs`
 * L2879-L2889). Repeats once per real user turn and again after compaction; the
 * dedup window resets at each occurrence.
 */
export interface TurnContextPayload {
  turn_id?: string;
  cwd?: string;
  workspace_roots?: string[];
  current_date?: string;
  model?: string;
  [key: string]: unknown;
}

/**
 * Token usage totals for an `event_msg` `token_count` event (`protocol.rs`
 * L1919-L1939, L2000-L2003).
 */
export interface TokenUsage {
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
  reasoning_output_tokens: number;
  total_tokens: number;
}

/**
 * Discriminated union over the `payload.type` of an `event_msg` line.
 *
 * Covers the high-level events the renderer presents — user/assistant messages,
 * token counts, and turn lifecycle markers (`protocol.rs` L1160 onward). The
 * open-ended final member preserves unknown/future variants so they never
 * invalidate the rest of the transcript. `message` events deliberately omit
 * `phase`: it is absent from `AgentMessageEvent`/`UserMessageEvent` for dedup
 * purposes (`protocol.rs` L2170-L2176), so relying on it would cause false
 * negatives.
 */
export type EventMsgPayload =
  | { type: 'agent_message'; message: string; phase?: MessagePhase }
  | { type: 'user_message'; message: string; client_id?: string; images?: string[] }
  | { type: 'token_count'; info?: { total_token_usage?: TokenUsage; last_token_usage?: TokenUsage } }
  | { type: 'task_started' }
  | { type: 'task_complete'; [key: string]: unknown }
  | { type: 'error'; message?: string }
  | { type: string; [key: string]: unknown };

/**
 * Result of parsing a single rollout JSONL line.
 *
 * The `unknown` member carries an unrecognized-but-valid root envelope (the
 * `timestamp` is preserved when present); `malformed` carries a line that was
 * not valid JSON or lacked a usable envelope, with the raw text retained so the
 * expanded view can render an isolated error block.
 */
export type CodexRolloutLine =
  | { kind: 'session_meta'; timestamp: string; payload: SessionMetaPayload }
  | { kind: 'response_item'; timestamp: string; payload: ResponseItemPayload }
  | { kind: 'compacted'; timestamp: string; payload: CompactedPayload }
  | { kind: 'turn_context'; timestamp: string; payload: TurnContextPayload }
  | { kind: 'event_msg'; timestamp: string; payload: EventMsgPayload }
  | { kind: 'unknown'; timestamp?: string; raw: unknown }
  | { kind: 'malformed'; raw: string };

/**
 * Parses one raw rollout JSONL line into a {@link CodexRolloutLine}.
 *
 * Validates the root `{ timestamp, type, payload }` envelope without asserting
 * any nested payload shape. Invalid JSON or an unusable envelope yields
 * `{ kind: 'malformed', raw }`; an unrecognized root `type` yields
 * `{ kind: 'unknown', raw }`.
 *
 * @param _raw - A single line of rollout JSONL.
 * @returns The discriminated parse result.
 * @throws Error 'not implemented' — Phase 1 stub.
 */
export function parseCodexLine(_raw: string): CodexRolloutLine {
  throw new Error('not implemented');
}
