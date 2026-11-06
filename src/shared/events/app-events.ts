// What happened in the application, as the services announce it. No framework
// and no ORM dependency.

export const TRIP_EVENT_TYPES = [
  'MEMBER_JOINED',
  'MEMBER_REMOVED',
  'MEMBER_PERMISSION_CHANGED',
  'DESTINATION_ADDED',
  'DESTINATION_UPDATED',
  'DESTINATION_REMOVED',
  'ACTIVITY_ADDED',
  'ACTIVITY_UPDATED',
  'ACTIVITY_REMOVED',
  'BUDGET_CHANGED',
  'TRIP_STATUS_CHANGED',
] as const;

export type TripEventType = (typeof TRIP_EVENT_TYPES)[number];

/** Small, flat and stable: it is stored as the notification payload. */
export type TripEventDetails = Record<string, string | number | boolean | null>;

/** Something changed on a trip; everyone on it is told, except who did it. */
export interface TripEvent {
  kind: 'trip';
  type: TripEventType;
  tripId: string;
  /** Who did it. They are never notified about their own action. */
  actorId: string;
  /** The thing that changed (a stop, an activity, a member's user id...). */
  subjectId?: string;
  details?: TripEventDetails;
  /** People to tell even though they are no longer on the trip, such as a removed member. */
  alsoNotify?: string[];
}

export const SUBMISSION_EVENT_TYPES = [
  'SUBMISSION_APPROVED',
  'SUBMISSION_REJECTED',
] as const;

export type SubmissionEventType = (typeof SUBMISSION_EVENT_TYPES)[number];

export const CATALOG_KINDS = ['TOURIST_SPOT', 'DESTINATION'] as const;

export type CatalogKind = (typeof CATALOG_KINDS)[number];

/** An administrator approved or rejected something a user suggested to a catalog. */
export interface SubmissionReviewedEvent {
  kind: 'submission';
  type: SubmissionEventType;
  /** The administrator. */
  actorId: string;
  /** Who suggested it; the one to tell. */
  authorId: string;
  catalog: CatalogKind;
  subjectId: string;
  subjectName: string;
  /** Why it was rejected. */
  reason?: string;
}

export type AppEvent = TripEvent | SubmissionReviewedEvent;

/**
 * How services announce a change: a port, so they stay unaware of who listens.
 * Declared as an abstract class so Nest can use it as a DI token.
 */
export abstract class EventPublisher {
  /** Fire and forget: a failure to notify must never fail the change itself. */
  abstract publish(event: AppEvent): void;
}
