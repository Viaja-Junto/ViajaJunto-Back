import type { Page, PageRequest } from '@shared/domain/pagination.js';
import { DestinationReview } from './destination-review.entity.js';

export interface DestinationReviewFilter {
  destinationId?: string;
}

export type CreateDestinationReviewData = Omit<
  DestinationReview,
  'id' | 'createdAt'
>;
export type UpdateDestinationReviewData = Partial<
  Pick<CreateDestinationReviewData, 'rating' | 'comment'>
>;

export abstract class DestinationReviewRepository {
  abstract findAll(
    page: PageRequest,
    filter: DestinationReviewFilter,
  ): Promise<Page<DestinationReview>>;
  abstract findById(id: string): Promise<DestinationReview | null>;
  abstract create(
    data: CreateDestinationReviewData,
  ): Promise<DestinationReview>;
  abstract update(
    id: string,
    data: UpdateDestinationReviewData,
  ): Promise<DestinationReview>;
  abstract remove(id: string): Promise<void>;
  abstract hasCompletedTripTo(
    userId: string,
    destinationId: string,
  ): Promise<boolean>;
}
