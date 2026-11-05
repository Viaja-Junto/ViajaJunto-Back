import { ApiProperty } from '@nestjs/swagger';
import type { PublicReview } from '../../../../shared/domain/public-review.js';
import { PublicReviewResponseDto } from '../../../../shared/http/dto/public-review-response.dto.js';
import type { Destination } from '../../domain/destination.entity.js';
import { DestinationResponseDto } from './destination-response.dto.js';

/** The public page of a destination: the entry, its rating and the latest reviews (FR23). */
export class DestinationDetailsResponseDto extends DestinationResponseDto {
  @ApiProperty({
    description:
      'The most recent reviews, newest first; the author is shown by name only.',
    type: [PublicReviewResponseDto],
  })
  latestReviews!: PublicReviewResponseDto[];

  static fromDetails(
    entity: Destination,
    reviews: PublicReview[],
  ): DestinationDetailsResponseDto {
    return {
      ...DestinationResponseDto.from(entity),
      latestReviews: reviews.map((review) =>
        PublicReviewResponseDto.from(review),
      ),
    };
  }
}
