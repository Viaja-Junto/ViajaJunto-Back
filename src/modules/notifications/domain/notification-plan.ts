import type {
  AppEvent,
  SubmissionReviewedEvent,
  TripEvent,
} from '@shared/events/app-events.js';
import type { NotificationPayload } from './notification.entity.js';
import type { NewNotification } from './notification.repository.js';

interface NotificationContext {
  actorName: string | null;
  trip?: { name: string | null; people: string[] };
}

function recipientsFor(event: TripEvent, tripPeople: string[]): string[] {
  return [...new Set([...tripPeople, ...(event.alsoNotify ?? [])])].filter(
    (userId) => userId !== event.actorId,
  );
}

export function notificationsFor(
  event: AppEvent,
  context: NotificationContext,
): NewNotification[] {
  return event.kind === 'trip'
    ? forTrip(event, context)
    : forSubmission(event, context);
}

function forTrip(
  event: TripEvent,
  context: NotificationContext,
): NewNotification[] {
  const payload: NotificationPayload = {
    tripName: context.trip?.name ?? null,
    actorName: context.actorName,
    ...(event.subjectId ? { subjectId: event.subjectId } : {}),
    ...event.details,
  };

  return recipientsFor(event, context.trip?.people ?? []).map((userId) => ({
    userId,
    tripId: event.tripId,
    actorId: event.actorId,
    type: event.type,
    payload,
  }));
}

function forSubmission(
  event: SubmissionReviewedEvent,
  context: NotificationContext,
): NewNotification[] {
  if (event.authorId === event.actorId) return [];

  return [
    {
      userId: event.authorId,
      tripId: null,
      actorId: event.actorId,
      type: event.type,
      payload: {
        actorName: context.actorName,
        catalog: event.catalog,
        subjectId: event.subjectId,
        subjectName: event.subjectName,
        ...(event.reason ? { reason: event.reason } : {}),
      },
    },
  ];
}
