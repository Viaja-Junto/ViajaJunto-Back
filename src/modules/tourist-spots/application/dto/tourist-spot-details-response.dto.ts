import { ApiProperty } from '@nestjs/swagger';
import type { PublicReview } from '@shared/domain/public-review.js';
import { PublicReviewResponseDto } from '@shared/http/dto/public-review-response.dto.js';
import type { TouristSpot } from '../../domain/tourist-spot.entity.js';
import { TouristSpotResponseDto } from './tourist-spot-response.dto.js';

/** The public page of a tourist spot: the entry, its rating and the latest reviews (FR23). */
export class TouristSpotDetailsResponseDto extends TouristSpotResponseDto {
  @ApiProperty({
    description:
      'The most recent reviews, newest first; the author is shown by name only.',
    type: [PublicReviewResponseDto],
  })
  latestReviews!: PublicReviewResponseDto[];

  static fromDetails(
    entity: TouristSpot,
    reviews: PublicReview[],
  ): TouristSpotDetailsResponseDto {
    return {
      ...TouristSpotResponseDto.from(entity),
      latestReviews: reviews.map((review) =>
        PublicReviewResponseDto.from(review),
      ),
    };
  }
}
