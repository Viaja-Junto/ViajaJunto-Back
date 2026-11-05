import type { Page, PageRequest } from '@shared/domain/pagination.js';
import { TripMember } from './trip-member.entity.js';

export interface TripMemberFilter {
  tripId?: string;
}

export type CreateTripMemberData = Omit<TripMember, 'id' | 'joinedAt'>;
export type UpdateTripMemberData = Partial<CreateTripMemberData>;

export abstract class TripMemberRepository {
  abstract findAll(
    page: PageRequest,
    userId: string,
    filter: TripMemberFilter,
  ): Promise<Page<TripMember>>;
  abstract findById(id: string): Promise<TripMember | null>;
  abstract findByTripAndUser(
    tripId: string,
    userId: string,
  ): Promise<TripMember | null>;
  abstract create(data: CreateTripMemberData): Promise<TripMember>;
  abstract update(id: string, data: UpdateTripMemberData): Promise<TripMember>;
  abstract remove(id: string): Promise<void>;
}
