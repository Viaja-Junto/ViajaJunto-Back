import { Injectable, NotFoundException } from '@nestjs/common';
import { assertOwner } from '../../../shared/http/assert-owner.js';
import {
  buildPaginationMeta,
  type PaginatedResponseDto,
} from '../../../shared/http/dto/paginated-response.dto.js';
import { toPageRequest } from '../../../shared/http/dto/pagination-query.dto.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import type { TouristSpot } from '../domain/tourist-spot.entity.js';
import { TouristSpotRepository } from '../domain/tourist-spot.repository.js';
import type { CreateTouristSpotDto } from './dto/create-tourist-spot.dto.js';
import type { ListTouristSpotsQueryDto } from './dto/list-tourist-spots-query.dto.js';
import { TouristSpotResponseDto } from './dto/tourist-spot-response.dto.js';
import type { UpdateTouristSpotDto } from './dto/update-tourist-spot.dto.js';

const ONLY_CREATOR = 'Only who registered the tourist spot can do this';

@Injectable()
export class TouristSpotsService {
  constructor(private readonly repository: TouristSpotRepository) {}

  async findAll(
    query: ListTouristSpotsQueryDto,
  ): Promise<PaginatedResponseDto<TouristSpotResponseDto>> {
    const { page, limit, skip, take } = toPageRequest(query);
    const { items, total } = await this.repository.findAll(
      { skip, take },
      {
        text: query.q,
        city: query.city,
        country: query.country,
        category: query.category,
        minRating: query.minRating,
      },
      query.sort ?? 'newest',
    );

    return {
      data: items.map((item) => TouristSpotResponseDto.from(item)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async findTop(limit: number): Promise<TouristSpotResponseDto[]> {
    return (await this.repository.findTopRated(limit)).map((spot) =>
      TouristSpotResponseDto.from(spot),
    );
  }

  async findOne(id: string): Promise<TouristSpotResponseDto> {
    return TouristSpotResponseDto.from(await this.getOrFail(id));
  }

  /** The creator is always the authenticated caller, never taken from the payload. */
  async create(
    dto: CreateTouristSpotDto,
    user: AuthenticatedUser,
  ): Promise<TouristSpotResponseDto> {
    return TouristSpotResponseDto.from(
      await this.repository.create({ ...dto, createdBy: user.id }),
    );
  }

  async update(
    id: string,
    dto: UpdateTouristSpotDto,
    user: AuthenticatedUser,
  ): Promise<TouristSpotResponseDto> {
    await this.getOwnedOrFail(id, user);

    return TouristSpotResponseDto.from(
      await this.repository.update(id, { ...dto }),
    );
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    await this.getOwnedOrFail(id, user);
    await this.repository.remove(id);
  }

  async getOrFail(id: string): Promise<TouristSpot> {
    const found = await this.repository.findById(id);

    if (!found) {
      throw new NotFoundException(`Tourist spot with id "${id}" not found`);
    }

    return found;
  }

  private async getOwnedOrFail(id: string, user: AuthenticatedUser) {
    const found = await this.getOrFail(id);

    assertOwner(found.createdBy, user, ONLY_CREATOR);

    return found;
  }
}
