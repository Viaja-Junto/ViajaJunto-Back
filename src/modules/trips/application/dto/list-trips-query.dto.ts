import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '@shared/http/dto/pagination-query.dto.js';

import { TRIP_STATUSES, type TripStatus } from '../../domain/trip.entity.js';

/** Query string of `GET /trips`: pagination plus an optional status filter. */
export class ListTripsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Only return trips in this planning stage.',
    enum: TRIP_STATUSES,
    example: 'PLANNING',
  })
  @IsOptional()
  @IsIn(TRIP_STATUSES)
  status?: TripStatus;
}
