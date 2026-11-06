import { endsBeforeStart, type Boundary } from '@shared/domain/date-range.js';

interface TripDates {
  startDate?: Boundary;
  endDate?: Boundary;
}

export function validateTripDates({ startDate, endDate }: TripDates): string[] {
  return endsBeforeStart(startDate, endDate)
    ? ['endDate must not be earlier than startDate']
    : [];
}
