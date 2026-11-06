import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { AppEvent } from '@shared/events/app-events.js';
import { APP_EVENT } from '@shared/events/emitter-event-publisher.js';
import { NotificationsService } from '../application/notifications.service.js';

@Injectable()
export class AppEventListener {
  private readonly logger = new Logger(AppEventListener.name);

  constructor(private readonly notifications: NotificationsService) {}

  @OnEvent(APP_EVENT, { async: true })
  async onEvent(event: AppEvent): Promise<void> {
    try {
      await this.notifications.notify(event);
    } catch (error) {
      // The change already happened; a missed notification must not surface as an error.
      this.logger.error(
        `Could not notify about ${event.type}: ${(error as Error).message}`,
      );
    }
  }
}
