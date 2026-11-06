import { Module } from '@nestjs/common';
import { AuthModule } from '@modules/auth/auth.module.js';
import { TripMembersModule } from '@modules/trip-members/trip-members.module.js';
import { TripAccessModule } from '@modules/trip-access/trip-access.module.js';
import { TripsService } from './application/trips.service.js';
import { TripRepository } from './domain/trip.repository.js';
import { TripPrismaRepository } from './infrastructure/trip.prisma.repository.js';
import { TripInviteController } from './presentation/trip-invite.controller.js';
import { TripsController } from './presentation/trips.controller.js';

@Module({
  imports: [AuthModule, TripAccessModule, TripMembersModule],
  controllers: [TripsController, TripInviteController],
  providers: [
    TripsService,
    { provide: TripRepository, useClass: TripPrismaRepository },
  ],
  exports: [TripsService],
})
export class TripsModule {}
