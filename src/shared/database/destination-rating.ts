import { Prisma } from '@prisma/client';
import { roundRating } from './spot-rating.js';

// Same locking as lockTouristSpots: one writer at a time, in id order.
export async function lockDestinations(
  tx: Prisma.TransactionClient,
  destinationIds: string[],
): Promise<void> {
  if (destinationIds.length === 0) return;

  await tx.$queryRaw`
    SELECT id FROM destination
    WHERE id IN (${Prisma.join([...new Set(destinationIds)])})
    ORDER BY id
    FOR UPDATE`;
}

export async function syncDestinationRatings(
  tx: Prisma.TransactionClient,
  destinationIds: string[],
): Promise<void> {
  for (const destinationId of new Set(destinationIds)) {
    const { _avg, _count } = await tx.destinationReview.aggregate({
      where: { destinationId },
      _avg: { rating: true },
      _count: { _all: true },
    });

    await tx.destination.update({
      where: { id: destinationId },
      data: {
        averageRating: _avg.rating === null ? null : roundRating(_avg.rating),
        reviewCount: _count._all,
      },
    });
  }
}
