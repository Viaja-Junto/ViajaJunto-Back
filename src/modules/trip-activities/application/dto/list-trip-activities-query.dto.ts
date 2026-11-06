import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '@shared/http/dto/pagination-query.dto.js';
import { SAMPLE } from '@shared/http/openapi-samples.js';

export class ListTripActivitiesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description:
      'Only return the trip destination whose planned activities to list, in chronological order.',
    format: 'uuid',
    example: SAMPLE.stopPortoAlegre,
  })
  @IsOptional()
  @IsUUID('4')
  tripDestinationId?: string;
}
