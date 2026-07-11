/**
 * Barrel export for the shared assistant-ui foundation both stream renderers
 * (claude-code-session, codex-session) build their expanded transcript on.
 *
 * @summary Shared assistant-ui foundation barrel export
 * @module streams/lib/aui/index
 */

export {
  BoundaryDataPart,
  ErrorLineDataPart,
  RawDataPart,
  StatusLineDataPart,
  UnregisteredDataPart
} from './DataParts';
export { MarkdownText } from './MarkdownText';
export {
  createAssistantMessage,
  createSystemMessage,
  createUserMessage,
  type StreamContentComponents
} from './messages';
export { ReasoningPart } from './ReasoningPart';
export { StreamThread } from './StreamThread';
export { createToolFallbackComponent, resultToText, ToolFallbackPart } from './ToolFallbackPart';
export type { BoundaryData, ErrorLineData, RawData, StatusLineData, ThreadMessageLike } from './types';
export { STREAM_DATA_PART_NAME } from './types';
