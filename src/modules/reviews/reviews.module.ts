import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TouristSpotsModule } from '../tourist-spots/tourist-spots.module.js';
import { ReviewsService } from './application/reviews.service.js';
import { ReviewRepository } from './domain/review.repository.js';
import { ReviewPrismaRepository } from './infrastructure/review.prisma.repository.js';
import { ReviewsController } from './presentation/reviews.controller.js';

@Module({
  imports: [AuthModule, TouristSpotsModule],
  controllers: [ReviewsController],
  providers: [
    ReviewsService,
    { provide: ReviewRepository, useClass: ReviewPrismaRepository },
  ],
})
export class ReviewsModule {}
