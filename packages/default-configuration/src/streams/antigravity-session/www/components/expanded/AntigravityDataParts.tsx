/**
 * Antigravity-specific `data` part renderer registered on `StreamThread`'s
 * `dataComponents` prop — the named anomaly event the shared four parts
 * (`boundary`/`raw`/`status-line`/`error-line`, ../../../../lib/aui/DataParts)
 * have no dedicated shape for.
 *
 * `agy-anomaly`: one named engine anomaly (host-drift / flush-partial /
 * format-unknown) with per-kind evidence treatment — host-drift and
 * flush-partial render their content as evidence; format-unknown withholds
 * the undecodable payload entirely (byte count only, never garbage text).
 *
 * @summary Antigravity-specific data part: agy-anomaly
 * @module streams/antigravity-session/www/components/expanded/AntigravityDataParts
 */

import type { DataMessagePartComponent } from '@assistant-ui/react';
import type React from 'react';
import type { AnomalyData } from '../../lib/to-thread-messages';

/** Per-kind presentation (icon, label) for the anomaly event line. */
const ANOMALY_PRESENTATION: Record<AnomalyData['kind'], { icon: string; label: string }> = {
  'host-drift': { icon: 'codicon-duplicate', label: 'Host drift' },
  'flush-partial': { icon: 'codicon-info', label: 'Partial flush' },
  'format-unknown': { icon: 'codicon-warning', label: 'Unreadable content (format unknown)' },
  'schema-drift': { icon: 'codicon-duplicate', label: 'Host drift · schema changed' }
};

/**
 * Renders one named anomaly event: a labeled severity line with the
 * engine-provided detail, plus the record's content as evidence for the
 * kinds whose payload is decodable. For `format-unknown` the payload is
 * withheld — only the withheld byte count is shown, so undecodable bytes are
 * never rendered as garbage text.
 *
 * @param root0 - The component props.
 * @param root0.data - The anomaly payload.
 * @returns Rendered named anomaly event element.
 */
export const AnomalyDataPart: DataMessagePartComponent<AnomalyData> = ({ data }): React.ReactElement => {
  // The assistant-ui data-part contract types `data` loosely; the converter
  // (to-thread-messages.ts) always emits the AnomalyData shape.
  const payload = data as AnomalyData;
  const presentation = ANOMALY_PRESENTATION[payload.kind];
  return (
    <div className="agy-anomaly">
      <div className="agy-anomaly-label">
        <span className={`codicon ${presentation.icon}`} />
        <span className="agy-anomaly-kind">{presentation.label}</span>
        {/* The session-level schema-drift sentinel has no step index — only
            per-step anomalies carry the idx chip. */}
        {payload.idx !== undefined && <span className="agy-anomaly-idx">step {payload.idx}</span>}
      </div>
      <div className="agy-anomaly-detail">{payload.detail}</div>
      {payload.kind === 'format-unknown' ? (
        <div className="agy-anomaly-detail">
          {payload.withheldBytes === undefined || payload.withheldBytes === 0
            ? 'Undecodable content withheld'
            : `${payload.withheldBytes} bytes of undecodable content withheld`}
        </div>
      ) : (
        payload.content !== undefined && <pre className="agy-anomaly-content">{payload.content}</pre>
      )}
    </div>
  );
};
