import type { Page, PageRequest } from '@shared/domain/pagination.js';
import type { TripRange } from './destination-dates.js';
import { TripDestination } from './trip-destination.entity.js';

export interface TripDestinationFilter {
  tripId?: string;
}

export type CreateTripDestinationData = Omit<TripDestination, 'id'>;
export type UpdateTripDestinationData = Partial<CreateTripDestinationData>;

export abstract class TripDestinationRepository {
  abstract findAll(
    page: PageRequest,
    userId: string,
    filter: TripDestinationFilter,
  ): Promise<Page<TripDestination>>;
  abstract findById(id: string): Promise<TripDestination | null>;
  abstract create(data: CreateTripDestinationData): Promise<TripDestination>;
  abstract update(
    id: string,
    data: UpdateTripDestinationData,
  ): Promise<TripDestination>;
  abstract findTripDates(tripId: string): Promise<TripRange | null>;
  abstract findByTrip(tripId: string): Promise<TripDestination[]>;
  abstract reorder(
    tripId: string,
    orderedIds: string[],
  ): Promise<TripDestination[]>;
  abstract remove(id: string): Promise<void>;
}
