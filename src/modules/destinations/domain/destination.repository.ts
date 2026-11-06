import type { CatalogStatus } from '@shared/domain/moderation.js';
import type { Page, PageRequest } from '@shared/domain/pagination.js';
import type { PublicReview } from '@shared/domain/public-review.js';
import type { Destination, DestinationCategory } from './destination.entity.js';

export interface DestinationFilter {
  text?: string;
  country?: string;
  category?: DestinationCategory;
  status?: CatalogStatus;
  createdBy?: string;
}

export type CreateDestinationData = Pick<
  Destination,
  'name' | 'country' | 'status' | 'createdBy'
> &
  Partial<
    Pick<
      Destination,
      | 'countryCode'
      | 'category'
      | 'description'
      | 'latitude'
      | 'longitude'
      | 'photoUrl'
    >
  >;

export type UpdateDestinationData = Partial<
  Omit<CreateDestinationData, 'createdBy'> &
    Pick<Destination, 'rejectionReason' | 'reviewedBy' | 'reviewedAt'>
>;

export abstract class DestinationRepository {
  abstract findAll(
    page: PageRequest,
    filter: DestinationFilter,
  ): Promise<Page<Destination>>;
  abstract findById(id: string): Promise<Destination | null>;
  abstract findTopRated(limit: number): Promise<Destination[]>;
  abstract create(data: CreateDestinationData): Promise<Destination>;
  abstract update(
    id: string,
    data: UpdateDestinationData,
  ): Promise<Destination>;
  abstract remove(id: string): Promise<void>;
  abstract findLatestReviews(
    id: string,
    limit: number,
  ): Promise<PublicReview[]>;
}
