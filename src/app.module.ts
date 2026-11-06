import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from '@modules/auth/auth.module.js';
import { BudgetsModule } from '@modules/budgets/budgets.module.js';
import { DestinationReviewsModule } from '@modules/destination-reviews/destination-reviews.module.js';
import { DestinationsModule } from '@modules/destinations/destinations.module.js';
import { HealthModule } from '@modules/health/health.module.js';
import { NotificationsModule } from '@modules/notifications/notifications.module.js';
import { FavoritesModule } from '@modules/favorites/favorites.module.js';
import { TripCalendarModule } from '@modules/trip-calendar/trip-calendar.module.js';
import { ReviewsModule } from '@modules/reviews/reviews.module.js';
import { TouristSpotsModule } from '@modules/tourist-spots/tourist-spots.module.js';
import { TripActivitiesModule } from '@modules/trip-activities/trip-activities.module.js';
import { TripDestinationsModule } from '@modules/trip-destinations/trip-destinations.module.js';
import { TripMembersModule } from '@modules/trip-members/trip-members.module.js';
import { TripsModule } from '@modules/trips/trips.module.js';
import { PrismaModule } from '@shared/database/prisma.module.js';
import { EventsModule } from '@shared/events/events.module.js';
import { StorageModule } from '@shared/storage/storage.module.js';
import { DomainExceptionFilter } from '@shared/http/domain-exception.filter.js';
import { PrismaExceptionFilter } from '@shared/http/prisma-exception.filter.js';
import {
  buildThrottlerOptions,
  rateLimitsFromEnv,
} from '@shared/http/throttling.js';

@Module({
  imports: [
    ThrottlerModule.forRoot(buildThrottlerOptions(rateLimitsFromEnv())),
    PrismaModule,
    EventsModule,
    StorageModule,
    HealthModule,
    AuthModule,
    DestinationsModule,
    TouristSpotsModule,
    ReviewsModule,
    DestinationReviewsModule,
    TripsModule,
    TripMembersModule,
    TripDestinationsModule,
    TripActivitiesModule,
    BudgetsModule,
    NotificationsModule,
    FavoritesModule,
    TripCalendarModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
  ],
})
export class AppModule {}
