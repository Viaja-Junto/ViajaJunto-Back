// Domain entity — no framework and no ORM dependency.
export interface TripDestination {
  id: string;
  tripId: string;
  destinationId: string;
  arrival?: Date | null;
  departure?: Date | null;
  description?: string | null;
  order?: number | null;
}
