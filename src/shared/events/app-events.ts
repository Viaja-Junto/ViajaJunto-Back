// What happened in the application, as the services announce it. No framework
// and no ORM dependency.

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

export type AppEvent = SubmissionReviewedEvent;

/**
 * How services announce a change: a port, so they stay unaware of who listens.
 * Declared as an abstract class so Nest can use it as a DI token.
 */
export abstract class EventPublisher {
  /** Fire and forget: a failure to notify must never fail the change itself. */
  abstract publish(event: AppEvent): void;
}
