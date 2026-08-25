/**
 * OpenCode-specific `data` part renderers registered on `StreamThread`'s
 * `dataComponents` prop — provider-specific rows the shared four
 * (`boundary`/`raw`/`status-line`/`error-line`, ../../../../lib/aui/DataParts)
 * have no dedicated shape for.
 *
 * `edited-files`: the readable edit row for a `patch` part's change set
 * (see `render-transcript.ts`'s `edited_files` item) — one leaf-mode
 * `<basename> edited` row for a single file, otherwise an "Edited N file(s)"
 * disclosure whose body lists basenames. Full absolute paths never render.
 *
 * `attachment`: the row for a `file` part prompt attachment, showing the
 * filename (plus the MIME type as a muted subtitle when present). The
 * payload's `url` is deliberately never rendered — it is commonly a raw
 * `data:` URL carrying the whole file body.
 *
 * @summary OpenCode-specific data parts: edited-files, attachment
 * @module streams/opencode-session/www/components/expanded/OpencodeDataParts
 */

import type { DataMessagePartComponent } from '@assistant-ui/react';
import type React from 'react';
import { ExpandableRow } from '../../../../lib/accordions/ExpandableRow';
import type { OpencodeAttachmentData, OpencodeEditedFilesData } from '../../lib/to-thread-messages';

/**
 * Derives a display basename from a path: the final segment after the last
 * `/` or `\` (OpenCode runs cross-platform, so Windows paths occur);
 * unchanged when no separator exists.
 * @param path - The absolute or relative path.
 * @returns The final path segment.
 */
function basename(path: string): string {
  const idx = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return idx >= 0 ? path.slice(idx + 1) : path;
}

/**
 * Renders the `edited-files` data part: one leaf `<basename> edited` row when
 * exactly one file changed, otherwise an expandable "Edited N file(s)" row
 * whose body lists each basename as a leaf row.
 * @param root0 - The component props.
 * @param root0.data - The edited-files payload (full absolute paths).
 * @returns Rendered edited-files row element.
 */
export const EditedFilesPart: DataMessagePartComponent<OpencodeEditedFilesData> = ({
  data
}): React.ReactElement | null => {
  const single = data.files.length === 1 ? data.files[0] : undefined;
  if (single !== undefined) {
    return <ExpandableRow expandable={false} header={`${basename(single)} edited`} />;
  }
  return (
    <ExpandableRow header={`Edited ${data.files.length} file(s)`}>
      {data.files.map((file: string) => (
        <ExpandableRow key={file} expandable={false} header={basename(file)} />
      ))}
    </ExpandableRow>
  );
};

/**
 * Renders the `attachment` data part: a leaf row showing the attachment's
 * filename, with the MIME type as a muted subtitle when present. The payload
 * `url` (often a whole-file `data:` URL) is never rendered.
 * @param root0 - The component props.
 * @param root0.data - The attachment payload.
 * @returns Rendered attachment row element.
 */
export const AttachmentPart: DataMessagePartComponent<OpencodeAttachmentData> = ({ data }): React.ReactElement => (
  <div>
    <ExpandableRow
      expandable={false}
      header={
        <span className="inline-flex items-center gap-1.5">
          <span className="codicon codicon-paperclip" style={{ color: 'var(--stream-fg-muted)' }} aria-hidden="true" />
          {data.filename}
        </span>
      }
    />
    {data.mime !== undefined && data.mime.length > 0 && (
      <div
        style={{
          color: 'var(--stream-fg-muted)',
          fontSize: 'var(--stream-text-label)',
          paddingLeft: 'calc(0.5rem + 1ch)'
        }}
      >
        {data.mime}
      </div>
    )}
  </div>
);
