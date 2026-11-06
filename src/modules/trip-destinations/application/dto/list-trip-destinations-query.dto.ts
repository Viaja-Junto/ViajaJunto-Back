import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '@shared/http/dto/pagination-query.dto.js';
import { SAMPLE } from '@shared/http/openapi-samples.js';

export class ListTripDestinationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description:
      'Only return the trip whose itinerary to list, ordered by `order`.',
    format: 'uuid',
    example: SAMPLE.plannedTrip,
  })
  @IsOptional()
  @IsUUID('4')
  tripId?: string;
}
