import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
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
}

export const TOURIST_SPOT_SORTS = ['newest', 'rating', 'name'] as const;
export type TouristSpotSort = (typeof TOURIST_SPOT_SORTS)[number];

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type CreateTouristSpotData = Optional<
  Omit<
    TouristSpot,
    'id' | 'averageRating' | 'reviewCount' | 'createdAt' | 'updatedAt'
  >,
  | 'description'
  | 'category'
  | 'address'
  | 'state'
  | 'countryCode'
  | 'latitude'
  | 'longitude'
  | 'photoUrl'
>;
export type UpdateTouristSpotData = Partial<
  Omit<CreateTouristSpotData, 'createdBy'>
>;

export abstract class TouristSpotRepository {
  abstract findAll(
    page: PageRequest,
    filter: TouristSpotFilter,
    sort: TouristSpotSort,
  ): Promise<Page<TouristSpot>>;
  abstract findById(id: string): Promise<TouristSpot | null>;
  /** Best rated first; spots without reviews are not listed. */
  abstract findTopRated(limit: number): Promise<TouristSpot[]>;
  abstract create(data: CreateTouristSpotData): Promise<TouristSpot>;
  abstract update(
    id: string,
    data: UpdateTouristSpotData,
  ): Promise<TouristSpot>;
  /** Its reviews go with it. */
  abstract remove(id: string): Promise<void>;
}
