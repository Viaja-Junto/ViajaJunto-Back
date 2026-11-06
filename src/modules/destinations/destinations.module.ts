import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ModerationModule } from '../moderation/moderation.module.js';
import { DestinationsService } from './application/destinations.service.js';
import { DestinationRepository } from './domain/destination.repository.js';
import { DestinationPrismaRepository } from './infrastructure/destination.prisma.repository.js';
import { DestinationsController } from './presentation/destinations.controller.js';

@Module({
  imports: [AuthModule, ModerationModule],
  controllers: [DestinationsController],
  providers: [
    DestinationsService,
    { provide: DestinationRepository, useClass: DestinationPrismaRepository },
  ],
  exports: [DestinationsService],
})
export class DestinationsModule {}
