import { PartialType, PickType } from '@nestjs/swagger';
import { CreateDestinationReviewDto } from './create-destination-review.dto.js';

export class UpdateDestinationReviewDto extends PartialType(
  PickType(CreateDestinationReviewDto, ['rating', 'comment'] as const),
) {}
