import { PartialType, PickType } from '@nestjs/swagger';
import { CreateReviewDto } from './create-review.dto.js';

/** The spot of a review never changes; only what was said about it. */
export class UpdateReviewDto extends PartialType(
  PickType(CreateReviewDto, ['rating', 'comment', 'visitedAt'] as const),
) {}
