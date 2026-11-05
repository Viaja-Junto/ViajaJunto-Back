import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventPublisher } from './app-events.js';
import { EmitterEventPublisher } from './emitter-event-publisher.js';

@Global()
@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [{ provide: EventPublisher, useClass: EmitterEventPublisher }],
  exports: [EventPublisher],
})
export class EventsModule {}
