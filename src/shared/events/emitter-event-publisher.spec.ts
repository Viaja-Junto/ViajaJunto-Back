import type { EventEmitter2 } from '@nestjs/event-emitter';
import { describe, expect, it, vi } from 'vitest';
import type { AppEvent } from './app-events.js';
import { APP_EVENT, EmitterEventPublisher } from './emitter-event-publisher.js';

const event: AppEvent = {
  kind: 'submission',
  type: 'SUBMISSION_APPROVED',
  actorId: 'admin',
  authorId: 'ana',
  catalog: 'TOURIST_SPOT',
  subjectId: 'spot',
  subjectName: 'Usina do Gasômetro',
};

describe('EmitterEventPublisher', () => {
  it('emits the event under the name listeners subscribe to', () => {
    const emitter = { emit: vi.fn() };

    new EmitterEventPublisher(emitter as unknown as EventEmitter2).publish(
      event,
    );

    expect(emitter.emit).toHaveBeenCalledWith(APP_EVENT, event);
  });

  it('never lets a failing listener break the change that announced it', () => {
    const emitter = {
      emit: vi.fn(() => {
        throw new Error('listener blew up');
      }),
    };

    expect(() =>
      new EmitterEventPublisher(emitter as unknown as EventEmitter2).publish(
        event,
      ),
    ).not.toThrow();
  });
});
