import { Module } from '@nestjs/common';
import { AuthModule } from '@modules/auth/auth.module.js';
import { TripAccessModule } from '@modules/trip-access/trip-access.module.js';
import { TripCalendarService } from './application/trip-calendar.service.js';
import { ItineraryRepository } from './domain/itinerary.js';
import { ItineraryPrismaRepository } from './infrastructure/itinerary.prisma.repository.js';
import { TripCalendarController } from './presentation/trip-calendar.controller.js';

@Module({
  imports: [AuthModule, TripAccessModule],
  controllers: [TripCalendarController],
  providers: [
    TripCalendarService,
    { provide: ItineraryRepository, useClass: ItineraryPrismaRepository },
  ],
})
export class TripCalendarModule {}
