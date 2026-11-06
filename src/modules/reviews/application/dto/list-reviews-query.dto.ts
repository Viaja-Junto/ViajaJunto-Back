import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { PaginationQueryDto } from '@shared/http/dto/pagination-query.dto.js';
import { SAMPLE } from '@shared/http/openapi-samples.js';

export class ListReviewsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Only the reviews of this tourist spot.',
    format: 'uuid',
    example: SAMPLE.usina,
  })
  @IsOptional()
  @IsUUID('4')
  touristSpotId?: string;

  @ApiPropertyOptional({
    description: 'Only the reviews written by this user.',
    format: 'uuid',
    example: SAMPLE.traveller,
  })
  @IsOptional()
  @IsUUID('4')
  userId?: string;

  @ApiPropertyOptional({
    description: 'Only reviews with at least this many stars.',
    minimum: 1,
    maximum: 5,
    example: 4,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  minRating?: number;
}
