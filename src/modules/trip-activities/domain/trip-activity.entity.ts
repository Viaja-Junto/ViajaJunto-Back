export interface TripActivity {
  id: string;
  tripDestinationId: string;
  touristSpotId: string;
  dateTime?: Date | null;
  durationMinutes?: number | null;
  expectedCost?: number | null;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED';
}
