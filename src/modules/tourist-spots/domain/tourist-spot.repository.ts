import type { CatalogStatus } from '@shared/domain/moderation.js';
import type { Page, PageRequest } from '@shared/domain/pagination.js';
import type { PublicReview } from '@shared/domain/public-review.js';
import type { SpotCategory, TouristSpot } from './tourist-spot.entity.js';

export interface TouristSpotFilter {
  text?: string;
  city?: string;
  country?: string;
  category?: SpotCategory;
  minRating?: number;
  destinationId?: string;
  status?: CatalogStatus;
  createdBy?: string;
}

export const TOURIST_SPOT_SORTS = ['newest', 'rating', 'name'] as const;
export type TouristSpotSort = (typeof TOURIST_SPOT_SORTS)[number];

export type CreateTouristSpotData = Pick<
  TouristSpot,
  'name' | 'city' | 'country' | 'status' | 'createdBy'
> &
  Partial<
    Pick<
      TouristSpot,
      | 'description'
      | 'category'
      | 'address'
      | 'state'
      | 'countryCode'
      | 'latitude'
      | 'longitude'
      | 'photoUrl'
      | 'destinationId'
    >
  >;

export type UpdateTouristSpotData = Partial<
  Omit<CreateTouristSpotData, 'createdBy'> &
    Pick<TouristSpot, 'rejectionReason' | 'reviewedBy' | 'reviewedAt'>
>;

export abstract class TouristSpotRepository {
  abstract findAll(
    page: PageRequest,
    filter: TouristSpotFilter,
    sort: TouristSpotSort,
  ): Promise<Page<TouristSpot>>;
  abstract findById(id: string): Promise<TouristSpot | null>;
  abstract findTopRated(limit: number): Promise<TouristSpot[]>;
  abstract create(data: CreateTouristSpotData): Promise<TouristSpot>;
  abstract update(
    id: string,
    data: UpdateTouristSpotData,
  ): Promise<TouristSpot>;
  abstract remove(id: string): Promise<void>;
  abstract findLatestReviews(
    id: string,
    limit: number,
  ): Promise<PublicReview[]>;
}
