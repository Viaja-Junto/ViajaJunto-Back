import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTripDestinationDto } from './create-trip-destination.dto.js';

export class UpdateTripDestinationDto extends PartialType(
  OmitType(CreateTripDestinationDto, ['tripId', 'destinationId'] as const),
) {}
