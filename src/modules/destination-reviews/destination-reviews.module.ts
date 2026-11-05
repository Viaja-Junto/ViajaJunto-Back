import { Module } from '@nestjs/common';
import { AuthModule } from '@modules/auth/auth.module.js';
import { DestinationsModule } from '@modules/destinations/destinations.module.js';
import { DestinationReviewsService } from './application/destination-reviews.service.js';
import { DestinationReviewRepository } from './domain/destination-review.repository.js';
import { DestinationReviewPrismaRepository } from './infrastructure/destination-review.prisma.repository.js';
import { DestinationReviewsController } from './presentation/destination-reviews.controller.js';

@Module({
  imports: [AuthModule, DestinationsModule],
  controllers: [DestinationReviewsController],
  providers: [
    DestinationReviewsService,
    {
      provide: DestinationReviewRepository,
      useClass: DestinationReviewPrismaRepository,
    },
  ],
})
export class DestinationReviewsModule {}
