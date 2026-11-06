import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsISO31661Alpha2,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Trimmed } from '@shared/http/dto/transforms.js';
import {
  DESTINATION_CATEGORIES,
  type DestinationCategory,
} from '../../domain/destination.entity.js';

export class CreateDestinationDto {
  @ApiProperty({
    description: 'Name of the city or region.',
    example: 'Canela',
    minLength: 2,
    maxLength: 160,
  })
  @Trimmed()
  @IsString()
  @Length(2, 160)
  name!: string;

  @ApiProperty({
    description: 'Country it is in.',
    example: 'Brasil',
    minLength: 2,
    maxLength: 100,
  })
  @Trimmed()
  @IsString()
  @Length(2, 100)
  country!: string;

  @ApiPropertyOptional({
    description:
      'ISO 3166-1 alpha-2 code of the country; lets the frontend map colour the countries a user visited.',
    example: 'BR',
    minLength: 2,
    maxLength: 2,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsISO31661Alpha2()
  countryCode?: string;

  @ApiPropertyOptional({
    description: 'Used by the discovery filters.',
    enum: DESTINATION_CATEGORIES,
    example: 'NATURE',
  })
  @IsOptional()
  @IsIn(DESTINATION_CATEGORIES)
  category?: DestinationCategory;

  @ApiPropertyOptional({
    description: 'Short summary shown on the destination page.',
    example:
      'Serra gaúcha, com a Cascata do Caracol e o Parque do Pinheiro Grosso.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Latitude in decimal degrees.',
    minimum: -90,
    maximum: 90,
    example: -29.365,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude in decimal degrees.',
    minimum: -180,
    maximum: 180,
    example: -50.816,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Cover image URL. Also settable by uploading a photo.',
    format: 'uri',
    example: 'https://upload.wikimedia.org/canela.jpg',
    maxLength: 2048,
  })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  photoUrl?: string;
}
