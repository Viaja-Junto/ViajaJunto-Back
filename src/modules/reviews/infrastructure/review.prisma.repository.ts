import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { Page, PageRequest } from '@shared/domain/pagination.js';
import { PrismaService } from '@shared/database/prisma.service.js';
import {
  lockTouristSpots,
  syncSpotRatings,
} from '@shared/database/spot-rating.js';
import type { Review } from '../domain/review.entity.js';
import {
  CreateReviewData,
  ReviewFilter,
  ReviewRepository,
  UpdateReviewData,
} from '../domain/review.repository.js';

@Injectable()
export class ReviewPrismaRepository implements ReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    { skip, take }: PageRequest,
    { touristSpotId, userId, minRating }: ReviewFilter,
  ): Promise<Page<Review>> {
    const where: Prisma.ReviewWhereInput = {
      touristSpotId,
      userId,
      ...(minRating !== undefined ? { rating: { gte: minRating } } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.review.count({ where }),
    ]);

    return { items, total };
  }

  findById(id: string): Promise<Review | null> {
    return this.prisma.review.findUnique({ where: { id } });
  }

  create(data: CreateReviewData): Promise<Review> {
    return this.prisma.$transaction(async (tx) => {
      await lockTouristSpots(tx, [data.touristSpotId]);
      const created = await tx.review.create({ data });
      await syncSpotRatings(tx, [created.touristSpotId]);

      return created;
    });
  }

  update(id: string, data: UpdateReviewData): Promise<Review> {
    return this.prisma.$transaction(async (tx) => {
      const { touristSpotId } = await tx.review.findUniqueOrThrow({
        where: { id },
        select: { touristSpotId: true },
      });
      await lockTouristSpots(tx, [touristSpotId]);
      const updated = await tx.review.update({ where: { id }, data });
      await syncSpotRatings(tx, [touristSpotId]);

      return updated;
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const { touristSpotId } = await tx.review.findUniqueOrThrow({
        where: { id },
        select: { touristSpotId: true },
      });
      await lockTouristSpots(tx, [touristSpotId]);
      await tx.review.delete({ where: { id } });
      await syncSpotRatings(tx, [touristSpotId]);
    });
  }
}
