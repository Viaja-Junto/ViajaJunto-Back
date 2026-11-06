import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { SAMPLE } from '@shared/http/openapi-samples.js';

export class CreateTripDestinationDto {
  @ApiProperty({
    description: 'Trip this stop belongs to.',
    format: 'uuid',
    example: SAMPLE.plannedTrip,
  })
  @IsUUID('4')
  tripId!: string;

  @ApiProperty({
    description: 'Published destination (city or region) being visited.',
    format: 'uuid',
    example: SAMPLE.rio,
  })
  @IsUUID('4')
  destinationId!: string;

  @ApiPropertyOptional({
    description: 'Arrival date (ISO 8601).',
    type: String,
    format: 'date',
    example: '2026-12-18',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  arrival?: Date;

  @ApiPropertyOptional({
    description: 'Departure date (ISO 8601). Must not be earlier than arrival.',
    type: String,
    format: 'date',
    example: '2026-12-20',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  departure?: Date;

  @ApiPropertyOptional({
    description: 'Notes specific to this stop.',
    example: 'Hospedagem no 11e arrondissement.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    description:
      'Position in the itinerary, ascending. Stops without a value are listed last.',
    minimum: 0,
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
