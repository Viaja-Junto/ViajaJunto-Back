import {
  SUBMISSION_EVENT_TYPES,
  TRIP_EVENT_TYPES,
} from '@shared/events/app-events.js';

export const NOTIFICATION_TYPES = [
  ...TRIP_EVENT_TYPES,
  ...SUBMISSION_EVENT_TYPES,
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationPayload = Record<
  string,
  string | number | boolean | null
>;

export interface Notification {
  id: string;
  userId: string;
  tripId: string | null;
  actorId: string | null;
  type: NotificationType;
  payload: NotificationPayload;
  readAt: Date | null;
  createdAt: Date;
}
