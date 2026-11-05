import {
  SUBMISSION_EVENT_TYPES,
  TRIP_EVENT_TYPES,
} from '../../../shared/events/app-events.js';

export const NOTIFICATION_TYPES = [
  ...TRIP_EVENT_TYPES,
  ...SUBMISSION_EVENT_TYPES,
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
