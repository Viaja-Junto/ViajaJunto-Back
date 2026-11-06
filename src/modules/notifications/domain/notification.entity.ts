export const NOTIFICATION_TYPES = [
  'SUBMISSION_APPROVED',
  'SUBMISSION_REJECTED',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Names and ids the client needs to say what happened; flat and stable. */
export type NotificationPayload = Record<
  string,
  string | number | boolean | null
>;

export interface Notification {
  id: string;
  /** Who it is for. */
  userId: string;
  /** The trip it happened on; null for the catalogs. */
  tripId: string | null;
  /** Who did it; null if they deleted their account. */
  actorId: string | null;
  type: NotificationType;
  payload: NotificationPayload;
  readAt: Date | null;
  createdAt: Date;
}
