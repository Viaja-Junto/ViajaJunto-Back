import type { Page, PageRequest } from '@shared/domain/pagination.js';
import type { DestinationStay } from './activity-schedule.js';
import { TripActivity } from './trip-activity.entity.js';

export interface TripActivityFilter {
  tripDestinationId?: string;
}

export type CreateTripActivityData = Omit<TripActivity, 'id'>;
export type UpdateTripActivityData = Partial<CreateTripActivityData>;

export abstract class TripActivityRepository {
  abstract findAll(
    page: PageRequest,
    userId: string,
    filter: TripActivityFilter,
  ): Promise<Page<TripActivity>>;
  abstract findById(id: string): Promise<TripActivity | null>;
  abstract create(data: CreateTripActivityData): Promise<TripActivity>;
  abstract update(
    id: string,
    data: UpdateTripActivityData,
  ): Promise<TripActivity>;
  abstract findDestinationStay(
    tripDestinationId: string,
  ): Promise<DestinationStay | null>;
  abstract remove(id: string): Promise<void>;
}
