import type { Prisma } from '@prisma/client';
import { escapeLike } from '@shared/database/like.js';
import type {
  TouristSpotFilter,
  TouristSpotSort,
} from '../domain/tourist-spot.repository.js';

/** Translates the filters into a Prisma `where`, combined with AND. */
export function buildTouristSpotWhere({
  text,
  city,
  country,
  category,
  minRating,
  destinationId,
  status,
  createdBy,
}: TouristSpotFilter): Prisma.TouristSpotWhereInput {
  const conditions: Prisma.TouristSpotWhereInput[] = [];

  if (text) {
    conditions.push({
      name: { contains: escapeLike(text), mode: 'insensitive' },
    });
  }
  if (city) {
    conditions.push({
      city: { equals: escapeLike(city), mode: 'insensitive' },
    });
  }
  if (country) {
    conditions.push({
      OR: [
        { country: { equals: escapeLike(country), mode: 'insensitive' } },
        { countryCode: { equals: escapeLike(country), mode: 'insensitive' } },
      ],
    });
  }
  if (category) {
    conditions.push({ category });
  }
  if (minRating !== undefined) {
    conditions.push({ averageRating: { gte: minRating } });
  }
  if (destinationId) conditions.push({ destinationId });
  if (status) conditions.push({ status });
  if (createdBy) conditions.push({ createdBy });

  return conditions.length > 0 ? { AND: conditions } : {};
}

/** Every order ends on the id, so pages never overlap or skip a row. */
export function buildTouristSpotOrderBy(
  sort: TouristSpotSort,
): Prisma.TouristSpotOrderByWithRelationInput[] {
  switch (sort) {
    case 'rating':
      return [
        { averageRating: { sort: 'desc', nulls: 'last' } },
        { reviewCount: 'desc' },
        { name: 'asc' },
        { id: 'asc' },
      ];
    case 'name':
      return [{ name: 'asc' }, { id: 'asc' }];
    case 'newest':
      return [{ createdAt: 'desc' }, { id: 'asc' }];
  }
}
