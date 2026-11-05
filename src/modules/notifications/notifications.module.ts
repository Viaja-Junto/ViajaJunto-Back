import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationsService } from './application/notifications.service.js';
import { NotificationRepository } from './domain/notification.repository.js';
import { AppEventListener } from './infrastructure/app-event.listener.js';
import { NotificationPrismaRepository } from './infrastructure/notification.prisma.repository.js';
import { NotificationsController } from './presentation/notifications.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    AppEventListener,
    { provide: NotificationRepository, useClass: NotificationPrismaRepository },
  ],
})
export class NotificationsModule {}
