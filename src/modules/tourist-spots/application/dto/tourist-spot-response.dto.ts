import { ApiProperty } from '@nestjs/swagger';
import { ModeratedResponseDto } from '@shared/http/dto/moderated-response.dto.js';
import {
  SPOT_CATEGORIES,
  type SpotCategory,
  type TouristSpot,
} from '../../domain/tourist-spot.entity.js';

export class TouristSpotResponseDto extends ModeratedResponseDto {
  @ApiProperty({
    description: 'Unique identifier.',
    format: 'uuid',
    example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  })
  id!: string;

  @ApiProperty({ description: 'Name.', example: 'Usina do Gasômetro' })
  name!: string;

  @ApiProperty({
    type: String,
    description: 'What makes the place worth a visit.',
    example:
      'Antiga usina termelétrica às margens do Guaíba, hoje centro cultural.',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({
    description: 'Discovery category.',
    enum: SPOT_CATEGORIES,
    example: 'HISTORICAL',
  })
  category!: SpotCategory;

  @ApiProperty({
    type: String,
    description: 'Street address.',
    example: 'Av. Presidente João Goulart, 551',
    nullable: true,
  })
  address!: string | null;

  @ApiProperty({ description: 'City.', example: 'Porto Alegre' })
  city!: string;

  @ApiProperty({
    type: String,
    description: 'State or province.',
    example: 'RS',
    nullable: true,
  })
  state!: string | null;

  @ApiProperty({ description: 'Country.', example: 'Brasil' })
  country!: string;

  @ApiProperty({
    type: String,
    description: 'ISO 3166-1 alpha-2 code of the country.',
    example: 'BR',
    nullable: true,
  })
  countryCode!: string | null;

  @ApiProperty({
    type: Number,
    description: 'Latitude in decimal degrees.',
    example: -30.034647,
    nullable: true,
  })
  latitude!: number | null;

  @ApiProperty({
    type: Number,
    description: 'Longitude in decimal degrees.',
    example: -51.241455,
    nullable: true,
  })
  longitude!: number | null;

  @ApiProperty({
    type: String,
    description: 'Cover image URL.',
    format: 'uri',
    example: 'https://upload.wikimedia.org/usina-do-gasometro.jpg',
    nullable: true,
  })
  photoUrl!: string | null;

  @ApiProperty({
    type: Number,
    description: 'Average rating, 1 to 5. Null until the first review.',
    example: 4.67,
    nullable: true,
  })
  averageRating!: number | null;

  @ApiProperty({
    description: 'How many reviews the average is based on.',
    minimum: 0,
    example: 3,
  })
  reviewCount!: number;

  @ApiProperty({
    type: String,
    format: 'uuid',
    description: 'The destination (city) the spot is in, when known.',
    example: '7d1f0c2a-5b3e-4f6a-8c9d-0e1f2a3b4c5d',
    nullable: true,
  })
  destinationId!: string | null;

  @ApiProperty({
    description: 'When the spot was registered.',
    type: String,
    format: 'date-time',
    example: '2026-11-05T14:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last change to the spot or its rating.',
    type: String,
    format: 'date-time',
    example: '2026-11-05T14:00:00.000Z',
  })
  updatedAt!: Date;

  static from(entity: TouristSpot): TouristSpotResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      category: entity.category,
      address: entity.address,
      city: entity.city,
      state: entity.state,
      country: entity.country,
      countryCode: entity.countryCode,
      latitude: entity.latitude,
      longitude: entity.longitude,
      photoUrl: entity.photoUrl,
      averageRating: entity.averageRating,
      reviewCount: entity.reviewCount,
      destinationId: entity.destinationId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      ...ModeratedResponseDto.fieldsFrom(entity),
    };
  }
}
