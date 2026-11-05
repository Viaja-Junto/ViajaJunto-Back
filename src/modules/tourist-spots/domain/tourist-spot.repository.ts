import type { CatalogStatus } from '@shared/domain/moderation.js';
import type { Page, PageRequest } from '@shared/domain/pagination.js';
import type { PublicReview } from '@shared/domain/public-review.js';
import type { SpotCategory, TouristSpot } from './tourist-spot.entity.js';

/** Every field that is set narrows the result. */
export interface TouristSpotFilter {
  /** Case-insensitive text contained in the name. */
  text?: string;
  /** City name, case-insensitive. */
  city?: string;
  /** Country name (case-insensitive) or ISO code. */
  country?: string;
  category?: SpotCategory;
  /** Only spots whose average rating is at least this. */
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
  /** Approved and reviewed, best rated first. */
  abstract findTopRated(limit: number): Promise<TouristSpot[]>;
  abstract create(data: CreateTouristSpotData): Promise<TouristSpot>;
  abstract update(
    id: string,
    data: UpdateTouristSpotData,
  ): Promise<TouristSpot>;
  /** Its reviews go with it. */
  abstract remove(id: string): Promise<void>;
  /** The most recent reviews, newest first. */
  abstract findLatestReviews(
    id: string,
    limit: number,
  ): Promise<PublicReview[]>;
}
