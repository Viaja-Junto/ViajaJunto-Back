import { Module } from '@nestjs/common';
import { AuthModule } from '@modules/auth/auth.module.js';
import { DestinationsModule } from '@modules/destinations/destinations.module.js';
import { ModerationModule } from '@modules/moderation/moderation.module.js';
import { TouristSpotsService } from './application/tourist-spots.service.js';
import { TouristSpotRepository } from './domain/tourist-spot.repository.js';
import { TouristSpotPrismaRepository } from './infrastructure/tourist-spot.prisma.repository.js';
import { TouristSpotsController } from './presentation/tourist-spots.controller.js';

@Module({
  imports: [AuthModule, ModerationModule, DestinationsModule],
  controllers: [TouristSpotsController],
  providers: [
    TouristSpotsService,
    { provide: TouristSpotRepository, useClass: TouristSpotPrismaRepository },
  ],
  exports: [TouristSpotsService],
})
export class TouristSpotsModule {}
