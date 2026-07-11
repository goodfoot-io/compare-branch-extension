/**
 * Shared `data` part renderers registered under `MessagePrimitive.Content`'s
 * `data.by_name` — the fixed system-row vocabulary both stream converters
 * emit for structural markers, unknown/malformed content, and status/error
 * lines. See {@link STREAM_DATA_PART_NAME} (./types.ts) for the exact `name`
 * values converters must use, and {@link UnregisteredDataPart} for the
 * `data.Fallback` shown when a converter emits an unrecognized name.
 *
 * @summary Shared data-part components: boundary, raw, status-line, error-line
 * @module streams/lib/aui/DataParts
 */

import type { DataMessagePartComponent } from '@assistant-ui/react';
import type React from 'react';
import { Boundary } from '../Boundary';
import { JsonBlock } from '../JsonBlock';
import { RawFallback } from '../RawFallback';
import { StatusLine } from '../status-line';
import type { BoundaryData, ErrorLineData, RawData, StatusLineData } from './types';

/**
 * Renders the `boundary` data part as the shared line-label-line separator.
 * @param root0 - The component props.
 * @param root0.data - The boundary payload (kind + label).
 * @returns Rendered boundary separator element.
 */
export const BoundaryDataPart: DataMessagePartComponent<BoundaryData> = ({ data }) => (
  <Boundary kind={data.kind} label={data.label} tooltip={data.tooltip} />
);

/**
 * Renders the `raw` data part as severity-aware labeled JSON.
 * @param root0 - The component props.
 * @param root0.data - The raw payload (value, optional label/severity).
 * @returns Rendered fallback block element.
 */
export const RawDataPart: DataMessagePartComponent<RawData> = ({ data }) => (
  <RawFallback data={data.data} label={data.label} severity={data.severity} />
);

/**
 * Renders the `status-line` data part as a muted italic single line.
 * @param root0 - The component props.
 * @param root0.data - The status-line payload (text).
 * @returns Rendered status line element.
 */
export const StatusLineDataPart: DataMessagePartComponent<StatusLineData> = ({ data }) => (
  <StatusLine text={data.text} />
);

/**
 * Renders the `error-line` data part: an error-colored message, plus optional structured detail as JSON.
 * @param root0 - The component props.
 * @param root0.data - The error-line payload (message, optional detail).
 * @returns Rendered error line element.
 */
export const ErrorLineDataPart: DataMessagePartComponent<ErrorLineData> = ({ data }) => (
  <div className="aui-error-line">
    <span className="codicon codicon-error aui-error-line__icon" aria-hidden="true" />
    <span>{data.message}</span>
    {data.detail !== undefined && <JsonBlock value={data.detail} />}
  </div>
);

/**
 * Fallback shown for a `data` part whose `name` matches none of the four
 * shared parts above (e.g. a converter typo, or a name added to a converter
 * before its renderer here) — never dropped silently.
 * @param root0 - The component props.
 * @param root0.name - The unrecognized data part name.
 * @param root0.data - The unrecognized data part payload.
 * @returns Rendered fallback block element.
 */
export const UnregisteredDataPart: DataMessagePartComponent = ({ name, data }): React.ReactElement => (
  <RawFallback data={data} label={`Unrecognized data part: ${name}`} severity="warning" />
);
