import {
  endsBeforeStart,
  formatDay,
  isOutsideDays,
  type Boundary,
} from '@shared/domain/date-range.js';

interface DestinationDates {
  arrival?: Boundary;
  departure?: Boundary;
}

export interface TripRange {
  startDate?: Boundary;
  endDate?: Boundary;
}

export function validateDestinationDates(
  { arrival, departure }: DestinationDates,
  trip: TripRange,
): string[] {
  const errors: string[] = [];

  if (endsBeforeStart(arrival, departure)) {
    errors.push('departure must not be earlier than arrival');
  }

  const tripWindow =
    trip.startDate && trip.endDate
      ? `${formatDay(trip.startDate)} to ${formatDay(trip.endDate)}`
      : trip.startDate
        ? `from ${formatDay(trip.startDate)}`
        : trip.endDate
          ? `until ${formatDay(trip.endDate)}`
          : '';

  for (const [name, day] of [
    ['arrival', arrival],
    ['departure', departure],
  ] as const) {
    if (isOutsideDays(day, trip.startDate, trip.endDate)) {
      errors.push(`${name} must be within the trip dates (${tripWindow})`);
    }
  }

  return errors;
}
