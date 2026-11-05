import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppEvent, EventPublisher } from './app-events.js';

export const APP_EVENT = 'viajajunto.event';

@Injectable()
export class EmitterEventPublisher implements EventPublisher {
  private readonly logger = new Logger(EmitterEventPublisher.name);

  constructor(private readonly emitter: EventEmitter2) {}

  publish(event: AppEvent): void {
    try {
      this.emitter.emit(APP_EVENT, event);
    } catch (error) {
      // Notifying is a side effect of the change, never a reason to undo it.
      this.logger.error(
        `Could not publish ${event.type}: ${(error as Error).message}`,
      );
    }
  }
}
