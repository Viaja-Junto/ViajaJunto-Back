import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsISO31661Alpha2,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Trimmed } from '../../../../shared/http/dto/trimmed-string.js';
import {
  SPOT_CATEGORIES,
  type SpotCategory,
} from '../../domain/tourist-spot.entity.js';

export class CreateTouristSpotDto {
  @ApiProperty({
    description: 'Name travellers know the place by.',
    example: 'Usina do Gasômetro',
    minLength: 2,
    maxLength: 160,
  })
  @Trimmed()
  @IsString()
  @Length(2, 160)
  name!: string;

  @ApiPropertyOptional({
    description: 'What makes the place worth a visit.',
    example:
      'Antiga usina termelétrica às margens do Guaíba, hoje centro cultural.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Used by the discovery filters.',
    enum: SPOT_CATEGORIES,
    default: 'OTHER',
    example: 'HISTORICAL',
  })
  @IsOptional()
  @IsIn(SPOT_CATEGORIES)
  category?: SpotCategory;

  @ApiPropertyOptional({
    description: 'Street address.',
    example: 'Av. Presidente João Goulart, 551',
    maxLength: 200,
  })
  @IsOptional()
  @Trimmed()
  @IsString()
  @MaxLength(200)
  address?: string;

  @ApiProperty({
    description: 'City the place is in.',
    example: 'Porto Alegre',
    minLength: 2,
    maxLength: 100,
  })
  @Trimmed()
  @IsString()
  @Length(2, 100)
  city!: string;

  @ApiPropertyOptional({
    description: 'State or province.',
    example: 'RS',
    maxLength: 100,
  })
  @IsOptional()
  @Trimmed()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiProperty({
    description: 'Country the place is in.',
    example: 'Brasil',
    minLength: 2,
    maxLength: 100,
  })
  @Trimmed()
  @IsString()
  @Length(2, 100)
  country!: string;

  @ApiPropertyOptional({
    description: 'ISO 3166-1 alpha-2 code of the country.',
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
    description: 'Latitude in decimal degrees.',
    minimum: -90,
    maximum: 90,
    example: -30.034647,
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
    example: -51.241455,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Cover image URL.',
    format: 'uri',
    example: 'https://upload.wikimedia.org/usina-do-gasometro.jpg',
    maxLength: 2048,
  })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  photoUrl?: string;

  @ApiPropertyOptional({
    description: 'The published destination (city) the spot is in.',
    format: 'uuid',
    example: '7d1f0c2a-5b3e-4f6a-8c9d-0e1f2a3b4c5d',
  })
  @IsOptional()
  @IsUUID('4')
  destinationId?: string;
}
