import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '@shared/http/dto/pagination-query.dto.js';
import { SAMPLE } from '@shared/http/openapi-samples.js';

export class ListDestinationReviewsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Only return the reviews of this catalog destination.',
    format: 'uuid',
    example: SAMPLE.portoAlegre,
  })
  @IsOptional()
  @IsUUID('4')
  destinationId?: string;
}
