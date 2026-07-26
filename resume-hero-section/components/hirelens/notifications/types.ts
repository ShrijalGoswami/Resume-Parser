/**
 * Notification model for the Notifications Center.
 *
 * Deliberately independent of any transport: the same shape is produced today
 * by deriving from signals the app already loads, and will be produced verbatim
 * by a `GET /notifications` endpoint when one exists. The UI only ever sees
 * this type.
 */

export type NotificationKind =
  /** An AI recommendation is waiting on a decision. */
  | 'recommendation'
  /** Something happened in a role or on a candidate. */
  | 'activity'

export type NotificationSeverity = 'urgent' | 'high' | 'medium' | 'low'

export interface HLNotification {
  /**
   * Stable across reloads and across sessions — read state is keyed on it, so
   * it must be derived from the source record's identity, never generated.
   */
  id: string
  kind: NotificationKind
  title: string
  /** One supporting line. Optional; the title must stand alone without it. */
  detail?: string
  severity: NotificationSeverity
  /** ISO-8601. Null when the source record carries no timestamp. */
  createdAt: string | null
  /** In-app destination for the notification's subject, if it has one. */
  href?: string
}

/** Per-notification local flags — the part that is genuinely device-local today. */
export interface NotificationState {
  readIds: string[]
  dismissedIds: string[]
}

export const EMPTY_NOTIFICATION_STATE: NotificationState = { readIds: [], dismissedIds: [] }

/** A notification joined with its read/dismissed flags — what the UI renders. */
export interface NotificationView extends HLNotification {
  read: boolean
}

/**
 * The swap point.
 *
 * Everything above the UI talks to this interface. Today it is satisfied by
 * `localNotificationState` (localStorage); when the backend ships a
 * notifications resource, implement this against it and change the single
 * binding in `use-notifications.ts` — no component changes.
 *
 * Async by construction so that becoming network-backed is not a signature
 * change.
 */
export interface NotificationStateSource {
  read(): Promise<NotificationState>
  markRead(ids: string[]): Promise<void>
  markAllRead(ids: string[]): Promise<void>
  markUnread(id: string): Promise<void>
  dismiss(id: string): Promise<void>
}
