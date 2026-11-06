export type TripRole = 'CREATOR' | 'EDITOR' | 'VIEWER';

export abstract class TripAccessRepository {
  abstract findRole(tripId: string, userId: string): Promise<TripRole | null>;
  abstract findTripIdByDestination(
    tripDestinationId: string,
  ): Promise<string | null>;
  abstract findTripIdByActivity(tripActivityId: string): Promise<string | null>;
}
