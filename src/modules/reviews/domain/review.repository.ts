import type { Page, PageRequest } from '@shared/domain/pagination.js';
import type { Review } from './review.entity.js';

export interface ReviewFilter {
  touristSpotId?: string;
  userId?: string;
  minRating?: number;
}

export type CreateReviewData = Pick<
  Review,
  'userId' | 'touristSpotId' | 'rating'
> &
  Partial<Pick<Review, 'comment' | 'visitedAt'>>;
export type UpdateReviewData = Partial<
  Pick<Review, 'rating' | 'comment' | 'visitedAt'>
>;

export abstract class ReviewRepository {
  abstract findAll(
    page: PageRequest,
    filter: ReviewFilter,
  ): Promise<Page<Review>>;
  abstract findById(id: string): Promise<Review | null>;
  abstract create(data: CreateReviewData): Promise<Review>;
  abstract update(id: string, data: UpdateReviewData): Promise<Review>;
  abstract remove(id: string): Promise<void>;
}
