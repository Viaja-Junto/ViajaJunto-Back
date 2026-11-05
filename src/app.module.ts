import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { ReviewsModule } from './modules/reviews/reviews.module.js';
import { TouristSpotsModule } from './modules/tourist-spots/tourist-spots.module.js';
import { PrismaModule } from './shared/database/prisma.module.js';
import { PrismaExceptionFilter } from './shared/http/prisma-exception.filter.js';
import {
  buildThrottlerOptions,
  rateLimitsFromEnv,
} from './shared/http/throttling.js';

@Module({
  imports: [
    ThrottlerModule.forRoot(buildThrottlerOptions(rateLimitsFromEnv())),
    PrismaModule,
    HealthModule,
    AuthModule,
    TouristSpotsModule,
    ReviewsModule,
  ],
  providers: [
    // Runs before the route guards, so a flood of requests is stopped before
    // any other work is done.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Registered here rather than in main.ts so the e2e suite exercises it too.
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}
