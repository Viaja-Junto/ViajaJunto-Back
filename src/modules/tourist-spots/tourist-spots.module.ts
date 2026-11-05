import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TouristSpotsService } from './application/tourist-spots.service.js';
import { TouristSpotRepository } from './domain/tourist-spot.repository.js';
import { TouristSpotPrismaRepository } from './infrastructure/tourist-spot.prisma.repository.js';
import { TouristSpotsController } from './presentation/tourist-spots.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [TouristSpotsController],
  providers: [
    TouristSpotsService,
    { provide: TouristSpotRepository, useClass: TouristSpotPrismaRepository },
  ],
  exports: [TouristSpotsService],
})
export class TouristSpotsModule {}
