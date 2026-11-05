import { ApiProperty } from '@nestjs/swagger';
import { ModeratedResponseDto } from '../../../../shared/http/dto/moderated-response.dto.js';
import {
  DESTINATION_CATEGORIES,
  type Destination,
  type DestinationCategory,
} from '../../domain/destination.entity.js';

export class DestinationResponseDto extends ModeratedResponseDto {
  @ApiProperty({
    description: 'Unique identifier.',
    format: 'uuid',
    example: '7d1f0c2a-5b3e-4f6a-8c9d-0e1f2a3b4c5d',
  })
  id!: string;

  @ApiProperty({
    description: 'Name of the city or region.',
    example: 'Gramado',
  })
  name!: string;

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
    description: 'Discovery category.',
    enum: DESTINATION_CATEGORIES,
    example: 'NATURE',
    nullable: true,
  })
  category!: DestinationCategory | null;

  @ApiProperty({
    type: String,
    description: 'Summary.',
    example: 'Cidade serrana conhecida pelo chocolate e pelo Natal Luz.',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({
    type: Number,
    description: 'Latitude.',
    example: -29.378,
    nullable: true,
  })
  latitude!: number | null;

  @ApiProperty({
    type: Number,
    description: 'Longitude.',
    example: -50.876,
    nullable: true,
  })
  longitude!: number | null;

  @ApiProperty({
    type: String,
    description: 'Cover image URL.',
    format: 'uri',
    example: 'https://upload.wikimedia.org/gramado.jpg',
    nullable: true,
  })
  photoUrl!: string | null;

  @ApiProperty({
    type: Number,
    description:
      'Average rating, 1 to 5, from travellers who completed a trip here. Null until the first review.',
    example: 4.8,
    nullable: true,
  })
  averageRating!: number | null;

  @ApiProperty({
    description: 'How many reviews the average is based on.',
    minimum: 0,
    example: 5,
  })
  reviewCount!: number;

  @ApiProperty({
    description: 'When it was suggested.',
    type: String,
    format: 'date-time',
    example: '2026-11-05T14:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last change.',
    type: String,
    format: 'date-time',
    example: '2026-11-05T14:00:00.000Z',
  })
  updatedAt!: Date;

  static from(entity: Destination): DestinationResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      country: entity.country,
      countryCode: entity.countryCode,
      category: entity.category,
      description: entity.description,
      latitude: entity.latitude,
      longitude: entity.longitude,
      photoUrl: entity.photoUrl,
      averageRating: entity.averageRating,
      reviewCount: entity.reviewCount,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      ...ModeratedResponseDto.fieldsFrom(entity),
    };
  }
}
