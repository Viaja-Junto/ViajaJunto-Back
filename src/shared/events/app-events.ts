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
  'EXPENSE_ADDED',
] as const;

type TripEventType = (typeof TRIP_EVENT_TYPES)[number];

type TripEventDetails = Record<string, string | number | boolean | null>;

export interface TripEvent {
  kind: 'trip';
  type: TripEventType;
  tripId: string;
  actorId: string;
  subjectId?: string;
  details?: TripEventDetails;
  alsoNotify?: string[];
}

export const SUBMISSION_EVENT_TYPES = [
  'SUBMISSION_APPROVED',
  'SUBMISSION_REJECTED',
] as const;

type SubmissionEventType = (typeof SUBMISSION_EVENT_TYPES)[number];

const CATALOG_KINDS = ['TOURIST_SPOT', 'DESTINATION'] as const;

export type CatalogKind = (typeof CATALOG_KINDS)[number];

export interface SubmissionReviewedEvent {
  kind: 'submission';
  type: SubmissionEventType;
  actorId: string;
  authorId: string;
  catalog: CatalogKind;
  subjectId: string;
  subjectName: string;
  reason?: string;
}

export type AppEvent = TripEvent | SubmissionReviewedEvent;

export abstract class EventPublisher {
  abstract publish(event: AppEvent): void;
}
