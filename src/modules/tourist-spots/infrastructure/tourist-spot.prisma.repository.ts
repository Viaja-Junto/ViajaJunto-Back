import { Injectable } from '@nestjs/common';
import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import type { PublicReview } from '../../../shared/domain/public-review.js';
import {
  publicReviewSelect,
  toPublicReviews,
} from '../../../shared/database/public-review.js';
import { PrismaService } from '../../../shared/database/prisma.service.js';
import type { TouristSpot } from '../domain/tourist-spot.entity.js';
import {
  CreateTouristSpotData,
  TouristSpotFilter,
  TouristSpotRepository,
  TouristSpotSort,
  UpdateTouristSpotData,
} from '../domain/tourist-spot.repository.js';
import {
  buildTouristSpotOrderBy,
  buildTouristSpotWhere,
} from './tourist-spot.filters.js';

@Injectable()
export class TouristSpotPrismaRepository implements TouristSpotRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    { skip, take }: PageRequest,
    filter: TouristSpotFilter,
    sort: TouristSpotSort,
  ): Promise<Page<TouristSpot>> {
    const where = buildTouristSpotWhere(filter);

    // One transaction so the page and the total come from the same snapshot.
    const [items, total] = await this.prisma.$transaction([
      this.prisma.touristSpot.findMany({
        where,
        skip,
        take,
        orderBy: buildTouristSpotOrderBy(sort),
      }),
      this.prisma.touristSpot.count({ where }),
    ]);

    return { items, total };
  }

  findById(id: string): Promise<TouristSpot | null> {
    return this.prisma.touristSpot.findUnique({ where: { id } });
  }

  findTopRated(limit: number): Promise<TouristSpot[]> {
    return this.prisma.touristSpot.findMany({
      where: { status: 'APPROVED', reviewCount: { gt: 0 } },
      orderBy: buildTouristSpotOrderBy('rating'),
      take: limit,
    });
  }

  create(data: CreateTouristSpotData): Promise<TouristSpot> {
    return this.prisma.touristSpot.create({ data });
  }

  update(id: string, data: UpdateTouristSpotData): Promise<TouristSpot> {
    return this.prisma.touristSpot.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.touristSpot.delete({ where: { id } });
  }

  async findLatestReviews(id: string, limit: number): Promise<PublicReview[]> {
    return toPublicReviews(
      await this.prisma.review.findMany({
        where: { touristSpotId: id },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: limit,
        select: publicReviewSelect,
      }),
    );
  }
}
