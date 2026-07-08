/**
 * Task notification line for the expanded transcript.
 *
 * Renders "Task {id}: {status} — {summary}" as a dimmed system line.
 *
 * @summary Task id: status — summary system line
 * @module components/expanded/messages/system/TaskNotification
 */

import type React from 'react';

interface TaskNotificationProps {
  /** Task identifier. */
  taskId: string;
  /** Task status string. */
  status: string;
  /** Human-readable summary. */
  summary: string;
}

/**
 * Dimmed system line for task lifecycle notifications.
 * @param root0 - The component props.
 * @param root0.taskId - Task identifier.
 * @param root0.status - Task status string.
 * @param root0.summary - Human-readable summary.
 * @returns Rendered task notification line element.
 */
export function TaskNotification({ taskId, status, summary }: TaskNotificationProps): React.ReactElement {
  return (
    <div className="stream-status-line py-0.5" style={{ fontSize: '0.8em', color: 'var(--stream-fg-muted)' }}>
      Task {taskId}: {status} — {summary}
    </div>
  );
}
