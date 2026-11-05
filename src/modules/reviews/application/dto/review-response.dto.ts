import { ApiProperty } from '@nestjs/swagger';
import type { Review } from '../../domain/review.entity.js';
import { formatVisitDate } from '../../domain/visit-date.js';

export class ReviewResponseDto {
  @ApiProperty({
    description: 'Unique identifier.',
    format: 'uuid',
    example: '9b2c6f1e-2d7a-4c1b-8f3e-5a6d7c8b9e0f',
  })
  id!: string;

  @ApiProperty({
    description: 'Author.',
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
  })
  userId!: string;

  @ApiProperty({
    description: 'Reviewed tourist spot.',
    format: 'uuid',
    example: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  })
  touristSpotId!: string;

  @ApiProperty({
    description: 'Rating from 1 to 5.',
    minimum: 1,
    maximum: 5,
    example: 5,
  })
  rating!: number;

  @ApiProperty({
    type: String,
    description: 'Free-text review.',
    example: 'Pôr do sol imperdível, vá no fim da tarde.',
    nullable: true,
  })
  comment!: string | null;

  @ApiProperty({
    type: String,
    description: 'Day of the visit.',
    format: 'date',
    example: '2026-10-12',
    nullable: true,
  })
  visitedAt!: string | null;

  @ApiProperty({
    description: 'When the review was written.',
    type: String,
    format: 'date-time',
    example: '2026-11-05T14:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last change to the review.',
    type: String,
    format: 'date-time',
    example: '2026-11-05T14:00:00.000Z',
  })
  updatedAt!: Date;

  static from(entity: Review): ReviewResponseDto {
    return {
      id: entity.id,
      userId: entity.userId,
      touristSpotId: entity.touristSpotId,
      rating: entity.rating,
      comment: entity.comment,
      visitedAt: entity.visitedAt ? formatVisitDate(entity.visitedAt) : null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
