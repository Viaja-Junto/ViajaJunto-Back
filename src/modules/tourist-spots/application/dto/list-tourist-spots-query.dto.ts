import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../../shared/http/dto/pagination-query.dto.js';
import { TrimmedText } from '../../../../shared/http/dto/search-text.js';
import {
  SPOT_CATEGORIES,
  type SpotCategory,
} from '../../domain/tourist-spot.entity.js';
import {
  TOURIST_SPOT_SORTS,
  type TouristSpotSort,
} from '../../domain/tourist-spot.repository.js';

export class ListTouristSpotsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Text to look for in the name (case-insensitive).',
    example: 'parque',
    maxLength: 100,
  })
  @TrimmedText()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({
    description: 'City name (case-insensitive, exact).',
    example: 'Porto Alegre',
    maxLength: 100,
  })
  @TrimmedText()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

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
    description: 'Only spots of this category.',
    enum: SPOT_CATEGORIES,
    example: 'PARK',
  })
  @IsOptional()
  @IsIn(SPOT_CATEGORIES)
  category?: SpotCategory;

  @ApiPropertyOptional({
    description: 'Only spots whose average rating is at least this.',
    minimum: 1,
    maximum: 5,
    example: 4,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({
    description:
      '`newest` (default), `rating` (best rated first, unrated last) or `name`.',
    enum: TOURIST_SPOT_SORTS,
    default: 'newest',
    example: 'rating',
  })
  @IsOptional()
  @IsIn(TOURIST_SPOT_SORTS)
  sort?: TouristSpotSort = 'newest';
}
