import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { SAMPLE } from '@shared/http/openapi-samples.js';

export class CreateTripActivityDto {
  @ApiProperty({
    description: 'Itinerary stop this activity belongs to.',
    format: 'uuid',
    example: SAMPLE.stopPortoAlegre,
  })
  @IsUUID('4')
  tripDestinationId!: string;

  @ApiProperty({
    description: 'Published tourist spot being scheduled.',
    format: 'uuid',
    example: SAMPLE.orla,
  })
  @IsUUID('4')
  touristSpotId!: string;

  @ApiPropertyOptional({
    description: 'Scheduled start, ISO 8601 with timezone.',
    type: String,
    format: 'date-time',
    example: '2026-12-12T20:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateTime?: Date;

  @ApiPropertyOptional({
    description: 'Estimated duration in minutes. Capped at one week.',
    minimum: 1,
    maximum: 10080,
    example: 180,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10080)
  durationMinutes?: number;

  @ApiPropertyOptional({
    description: 'Estimated cost per person, feeding the trip budget.',
    minimum: 0,
    example: 22.5,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  expectedCost?: number;

  @ApiPropertyOptional({
    description: 'Booking status. Defaults to PENDING.',
    enum: ['PENDING', 'CONFIRMED', 'COMPLETED'],
    default: 'PENDING',
    example: 'PENDING',
  })
  @IsOptional()
  @IsIn(['PENDING', 'CONFIRMED', 'COMPLETED'])
  status?: 'PENDING' | 'CONFIRMED' | 'COMPLETED';
}
