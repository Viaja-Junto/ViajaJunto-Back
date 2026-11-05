const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `YYYY-MM-DD` as midnight UTC, or null when it is not a real calendar day. */
export function parseVisitDate(day: string): Date | null {
  const match = ISO_DAY.exec(day);
  if (!match) return null;

  const [, year, month, date] = match.map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, date));

  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === date
    ? parsed
    : null;
}

/**
 * A traveller reviews a visit that already happened. Compared by calendar day
 * with a day of slack, so someone ahead of UTC can still review today's visit.
 */
export function isFutureVisit(
  visitedAt: Date,
  now: Date = new Date(),
): boolean {
  const tomorrow = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );

  return visitedAt.getTime() > tomorrow;
}

export const formatVisitDate = (visitedAt: Date): string =>
  visitedAt.toISOString().slice(0, 10);
