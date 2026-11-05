import type { Prisma } from '@prisma/client';
import { escapeLike } from '@shared/database/like.js';
import type { DestinationFilter } from '../domain/destination.repository.js';

/** Translates the filters into a Prisma `where`, combined with AND. */
export function buildDestinationWhere({
  text,
  country,
  category,
  status,
  createdBy,
}: DestinationFilter): Prisma.DestinationWhereInput {
  const conditions: Prisma.DestinationWhereInput[] = [];

  if (text) {
    conditions.push({
      name: { contains: escapeLike(text), mode: 'insensitive' },
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
  if (category) conditions.push({ category });
  if (status) conditions.push({ status });
  if (createdBy) conditions.push({ createdBy });

  return conditions.length > 0 ? { AND: conditions } : {};
}
