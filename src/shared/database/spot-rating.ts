import { Prisma } from '@prisma/client';

/**
 * At most two decimals, rounding halves up. EPSILON keeps 1.005 (stored as
 * 1.00499…) from rounding down.
 */
export const roundRating = (average: number): number =>
  Math.round((average + Number.EPSILON) * 100) / 100;

/**
 * Locks the spots so that two transactions changing reviews of the same spot
 * run one after the other. Without it each would aggregate a snapshot that
 * misses the other's uncommitted review, and the slower write would store a
 * stale average.
 */
export async function lockTouristSpots(
  tx: Prisma.TransactionClient,
  spotIds: string[],
): Promise<void> {
  if (spotIds.length === 0) return;

  // Locked in id order, so transactions taking several locks cannot deadlock.
  await tx.$queryRaw`
    SELECT id FROM tourist_spot
    WHERE id IN (${Prisma.join([...new Set(spotIds)])})
    ORDER BY id
    FOR UPDATE`;
}

/** Recomputes the average and count of the spots inside the transaction that changed their reviews. */
export async function syncSpotRatings(
  tx: Prisma.TransactionClient,
  spotIds: string[],
): Promise<void> {
  for (const touristSpotId of new Set(spotIds)) {
    const { _avg, _count } = await tx.review.aggregate({
      where: { touristSpotId },
      _avg: { rating: true },
      _count: { _all: true },
    });

    await tx.touristSpot.update({
      where: { id: touristSpotId },
      data: {
        averageRating: _avg.rating === null ? null : roundRating(_avg.rating),
        reviewCount: _count._all,
      },
    });
  }
}
