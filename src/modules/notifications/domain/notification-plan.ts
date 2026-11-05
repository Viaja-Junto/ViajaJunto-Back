// Who is told about an event, and what they are told. Pure.
import type { AppEvent } from '../../../shared/events/app-events.js';
import type { NewNotification } from './notification.repository.js';

/**
 * The notifications an event produces. The person who did it is never told
 * about their own action.
 */
export function notificationsFor(
  event: AppEvent,
  context: { actorName: string | null },
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
