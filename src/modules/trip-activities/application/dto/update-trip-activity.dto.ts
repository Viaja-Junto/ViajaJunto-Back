import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTripActivityDto } from './create-trip-activity.dto.js';

export class UpdateTripActivityDto extends PartialType(
  OmitType(CreateTripActivityDto, [
    'tripDestinationId',
    'touristSpotId',
  ] as const),
) {}
