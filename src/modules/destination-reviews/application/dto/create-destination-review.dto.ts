import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SAMPLE } from '@shared/http/openapi-samples.js';

export class CreateDestinationReviewDto {
  @ApiProperty({
    description: 'Catalog destination being reviewed.',
    format: 'uuid',
    example: SAMPLE.portoAlegre,
  })
  @IsUUID('4')
  destinationId!: string;

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
    example: 'Cidade linda e fácil de explorar a pé.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
