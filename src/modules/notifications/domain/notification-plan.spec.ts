import { describe, expect, it } from 'vitest';
import type { SubmissionReviewedEvent } from '../../../shared/events/app-events.js';
import { notificationsFor } from './notification-plan.js';

const event = (
  overrides: Partial<SubmissionReviewedEvent> = {},
): SubmissionReviewedEvent => ({
  kind: 'submission',
  type: 'SUBMISSION_APPROVED',
  actorId: 'admin',
  authorId: 'ana',
  catalog: 'TOURIST_SPOT',
  subjectId: 'spot',
  subjectName: 'Usina do Gasômetro',
  ...overrides,
});

describe('notificationsFor (moderation)', () => {
  it('tells the author what happened to their suggestion', () => {
    expect(notificationsFor(event(), { actorName: 'Administrador' })).toEqual([
      {
        userId: 'ana',
        tripId: null,
        actorId: 'admin',
        type: 'SUBMISSION_APPROVED',
        payload: {
          actorName: 'Administrador',
          catalog: 'TOURIST_SPOT',
          subjectId: 'spot',
          subjectName: 'Usina do Gasômetro',
        },
      },
    ]);
  });

  it('carries the reason of a rejection', () => {
    const [notification] = notificationsFor(
      event({ type: 'SUBMISSION_REJECTED', reason: 'Duplicado' }),
      { actorName: null },
    );

    expect(notification.payload).toMatchObject({
      reason: 'Duplicado',
      actorName: null,
    });
  });

  it('tells nobody when the administrator reviewed their own suggestion', () => {
    expect(
      notificationsFor(event({ authorId: 'admin' }), { actorName: 'A' }),
    ).toEqual([]);
  });
});
