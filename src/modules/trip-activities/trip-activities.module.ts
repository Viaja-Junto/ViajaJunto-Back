import { TripAccessModule } from '../trip-access/trip-access.module.js';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TouristSpotsModule } from '../tourist-spots/tourist-spots.module.js';
import { TripActivitiesService } from './application/trip-activities.service.js';
import { TripActivityRepository } from './domain/trip-activity.repository.js';
import { TripActivityPrismaRepository } from './infrastructure/trip-activity.prisma.repository.js';
import { TripActivitiesController } from './presentation/trip-activities.controller.js';

@Module({
  imports: [AuthModule, TripAccessModule, TouristSpotsModule],
  controllers: [TripActivitiesController],
  providers: [
    TripActivitiesService,
    { provide: TripActivityRepository, useClass: TripActivityPrismaRepository },
  ],
  exports: [TripActivitiesService],
})
export class TripActivitiesModule {}
