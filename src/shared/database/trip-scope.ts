import type { Prisma } from '@prisma/client';

export function accessibleTrips(userId: string): Prisma.TripWhereInput {
  return {
    OR: [{ createdBy: userId }, { members: { some: { userId } } }],
  };
}
