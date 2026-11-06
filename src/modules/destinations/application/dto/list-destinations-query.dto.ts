import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../../shared/http/dto/pagination-query.dto.js';
import { TrimmedText } from '../../../../shared/http/dto/search-text.js';
import {
  DESTINATION_CATEGORIES,
  type DestinationCategory,
} from '../../domain/destination.entity.js';

export class ListDestinationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Text to look for in the name (case-insensitive).',
    example: 'gram',
    maxLength: 100,
  })
  @TrimmedText()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({
    description:
      'Country name (case-insensitive, exact) or its ISO 3166-1 alpha-2 code.',
    example: 'BR',
    maxLength: 100,
  })
  @TrimmedText()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({
    description: 'Only destinations of this category.',
    enum: DESTINATION_CATEGORIES,
    example: 'CITY',
  })
  @IsOptional()
  @IsIn(DESTINATION_CATEGORIES)
  category?: DestinationCategory;
}
