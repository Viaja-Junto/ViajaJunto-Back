import { ApiProperty } from '@nestjs/swagger';
import type { FavoriteIds } from '../../domain/favorite.repository.js';

export class FavoriteIdsResponseDto {
  @ApiProperty({
    description: 'Destinations the caller saved.',
    type: [String],
    format: 'uuid',
  })
  destinationIds!: string[];

  @ApiProperty({
    description: 'Tourist spots the caller saved.',
    type: [String],
    format: 'uuid',
  })
  touristSpotIds!: string[];

  static from(ids: FavoriteIds): FavoriteIdsResponseDto {
    return {
      destinationIds: ids.destinationIds,
      touristSpotIds: ids.touristSpotIds,
    };
  }
}
