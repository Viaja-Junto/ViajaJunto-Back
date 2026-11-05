export type Boundary = Date | null | undefined;

const DAY_MS = 24 * 60 * 60 * 1000;

export function endsBeforeStart(start: Boundary, end: Boundary): boolean {
  return !!start && !!end && end.getTime() < start.getTime();
}

export function isOutsideDays(
  day: Boundary,
  start: Boundary,
  end: Boundary,
): boolean {
  if (!day) return false;

  return (
    (!!start && day.getTime() < start.getTime()) ||
    (!!end && day.getTime() > end.getTime())
  );
}

export function isOutsideDayRange(
  instant: Boundary,
  start: Boundary,
  end: Boundary,
): boolean {
  if (!instant) return false;

  return (
    (!!start && instant.getTime() < start.getTime()) ||
    (!!end && instant.getTime() >= end.getTime() + DAY_MS)
  );
}

export function formatDay(day: Date): string {
  return day.toISOString().slice(0, 10);
}
