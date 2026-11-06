import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SAMPLE } from '@shared/http/openapi-samples.js';

export class CreateReviewDto {
  @ApiProperty({
    description: 'Tourist spot being reviewed.',
    format: 'uuid',
    example: SAMPLE.orla,
  })
  @IsUUID('4')
  touristSpotId!: string;

  @ApiProperty({
    description: 'Rating from 1 to 5 stars.',
    minimum: 1,
    maximum: 5,
    example: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({
    description: 'Optional free-text review.',
    example: 'Pôr do sol imperdível, vá no fim da tarde.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;

  @ApiPropertyOptional({
    description: 'Day of the visit; it cannot be in the future.',
    format: 'date',
    example: '2026-10-12',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'visitedAt must be YYYY-MM-DD' })
  @IsISO8601({ strict: true }, { message: 'visitedAt must be a real day' })
  visitedAt?: string;
}
