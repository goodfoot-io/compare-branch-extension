/**
 * Files persisted notification line for the expanded transcript.
 *
 * Displays how many files were saved (and failed, if any).
 *
 * @summary Files persisted: N saved [, N failed] system line
 * @module components/expanded/messages/system/FilesPersisted
 */

import type React from 'react';

interface FilesPersistedProps {
  /** Number of successfully saved files. */
  saved: number;
  /** Number of files that failed to save. */
  failed: number;
}

/**
 * Italic dimmed line showing file persistence results.
 * @param root0 - The component props.
 * @param root0.saved - Number of successfully saved files.
 * @param root0.failed - Number of files that failed to save.
 * @returns Rendered file persistence notification line.
 */
export function FilesPersisted({ saved, failed }: FilesPersistedProps): React.ReactElement {
  const text = failed > 0 ? `Files persisted: ${saved} saved, ${failed} failed` : `Files persisted: ${saved} saved`;

  return <div className="text-[0.8em] text-vscode-descriptionForeground italic py-0.5">{text}</div>;
}
