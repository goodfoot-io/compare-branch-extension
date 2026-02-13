/**
 * Notification payloads shared between Cards V2 clients and services.
 *
 * These types keep the UI and server aligned on what constitutes a notification
 * and how severity is interpreted.
 *
 *
 * @summary Notification payloads shared between Cards V2 clients and services
 * @module types/notifications
 */

/**
 * Severity level used for prioritizing notifications in the UI.
 */
export type NotificationSeverity = 'error' | 'warning' | 'info';

/**
 * Request body for creating a notification.
 */
export interface NotificationCreateRequest {
  /** Severity level used for sorting or styling. */
  type: NotificationSeverity;
  /** Short title shown in lists and banners. */
  title: string;
  /** Detailed message shown in the notification body. */
  message: string;
  /** Source identifier used for grouping or filtering. */
  source: string;
}
