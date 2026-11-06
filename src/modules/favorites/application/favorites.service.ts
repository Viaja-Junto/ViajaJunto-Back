import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '@shared/domain/authenticated-user.js';
import {
  buildPaginationMeta,
  type PaginatedResponseDto,
} from '@shared/http/dto/paginated-response.dto.js';
import {
  type PaginationQueryDto,
  toPageRequest,
} from '@shared/http/dto/pagination-query.dto.js';
import { DestinationsService } from '@modules/destinations/application/destinations.service.js';
import { DestinationResponseDto } from '@modules/destinations/application/dto/destination-response.dto.js';
import { TouristSpotsService } from '@modules/tourist-spots/application/tourist-spots.service.js';
import { TouristSpotResponseDto } from '@modules/tourist-spots/application/dto/tourist-spot-response.dto.js';
import {
  type FavoriteKind,
  FavoriteRepository,
} from '../domain/favorite.repository.js';
import { FavoriteIdsResponseDto } from './dto/favorite-ids-response.dto.js';

@Injectable()
export class FavoritesService {
  constructor(
    private readonly repository: FavoriteRepository,
    private readonly destinations: DestinationsService,
    private readonly touristSpots: TouristSpotsService,
  ) {}

  async ids(user: AuthenticatedUser): Promise<FavoriteIdsResponseDto> {
    return FavoriteIdsResponseDto.from(await this.repository.ids(user.id));
  }

  async listDestinations(
    query: PaginationQueryDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<DestinationResponseDto>> {
    const { page, limit, skip, take } = toPageRequest(query);
    const { items, total } = await this.repository.listDestinations(user.id, {
      skip,
      take,
    });

    return {
      data: items.map((item) => DestinationResponseDto.from(item)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async listTouristSpots(
    query: PaginationQueryDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<TouristSpotResponseDto>> {
    const { page, limit, skip, take } = toPageRequest(query);
    const { items, total } = await this.repository.listTouristSpots(user.id, {
      skip,
      take,
    });

    return {
      data: items.map((item) => TouristSpotResponseDto.from(item)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async add(
    kind: FavoriteKind,
    id: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    if (kind === 'destination') {
      await this.destinations.getApprovedOrFail(id);
    } else {
      await this.touristSpots.getApprovedOrFail(id);
    }

    await this.repository.add(user.id, kind, id);
  }

  remove(
    kind: FavoriteKind,
    id: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    return this.repository.remove(user.id, kind, id);
  }
}
