import {
  formatDay,
  isOutsideDayRange,
  type Boundary,
} from '@shared/domain/date-range.js';

export interface DestinationStay {
  arrival?: Boundary;
  departure?: Boundary;
}

export function validateActivityDateTime(
  dateTime: Boundary,
  { arrival, departure }: DestinationStay,
): string[] {
  if (!isOutsideDayRange(dateTime, arrival, departure)) {
    return [];
  }

  const stay =
    arrival && departure
      ? `${formatDay(arrival)} to ${formatDay(departure)}`
      : arrival
        ? `from ${formatDay(arrival)}`
        : `until ${formatDay(departure as Date)}`;

  return [`dateTime must be within the destination stay (${stay})`];
}
