import { Injectable, NotFoundException } from '@nestjs/common';
import {
  buildPaginationMeta,
  type PaginatedResponseDto,
} from '../../../shared/http/dto/paginated-response.dto.js';
import {
  toPageRequest,
  type PaginationQueryDto,
} from '../../../shared/http/dto/pagination-query.dto.js';
import type {
  ModerationQueryDto,
  MySubmissionsQueryDto,
} from '../../../shared/http/dto/moderation.dto.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import { DestinationsService } from '../../destinations/application/destinations.service.js';
import { ModerationService } from '../../moderation/application/moderation.service.js';
import type { TouristSpot } from '../domain/tourist-spot.entity.js';
import {
  TouristSpotRepository,
  type TouristSpotFilter,
  type TouristSpotSort,
} from '../domain/tourist-spot.repository.js';
import type { CreateTouristSpotDto } from './dto/create-tourist-spot.dto.js';
import type { ListTouristSpotsQueryDto } from './dto/list-tourist-spots-query.dto.js';
import { TouristSpotResponseDto } from './dto/tourist-spot-response.dto.js';
import type { UpdateTouristSpotDto } from './dto/update-tourist-spot.dto.js';

@Injectable()
export class TouristSpotsService {
  constructor(
    private readonly repository: TouristSpotRepository,
    private readonly moderation: ModerationService,
    private readonly destinations: DestinationsService,
  ) {}

  /** Public: only approved spots. */
  findAll(
    query: ListTouristSpotsQueryDto,
  ): Promise<PaginatedResponseDto<TouristSpotResponseDto>> {
    return this.page(
      query,
      {
        text: query.q,
        city: query.city,
        country: query.country,
        category: query.category,
        minRating: query.minRating,
        destinationId: query.destinationId,
        status: 'APPROVED',
      },
      query.sort ?? 'newest',
    );
  }

  /** The caller's own suggestions, whatever their state. */
  findMine(
    query: MySubmissionsQueryDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<TouristSpotResponseDto>> {
    return this.page(
      query,
      { createdBy: user.id, status: query.status },
      'newest',
    );
  }

  /** The administrators' review queue, oldest suggestions last. */
  async findForModeration(
    query: ModerationQueryDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<TouristSpotResponseDto>> {
    await this.moderation.assertAdmin(user);

    return this.page(query, { status: query.status ?? 'PENDING' }, 'newest');
  }

  async findTop(limit: number): Promise<TouristSpotResponseDto[]> {
    return (await this.repository.findTopRated(limit)).map((spot) =>
      TouristSpotResponseDto.from(spot),
    );
  }

  async findOne(id: string): Promise<TouristSpotResponseDto> {
    return TouristSpotResponseDto.from(await this.getApprovedOrFail(id));
  }

  /** The author is always the caller; the status depends on whether they are an administrator. */
  async create(
    dto: CreateTouristSpotDto,
    user: AuthenticatedUser,
  ): Promise<TouristSpotResponseDto> {
    await this.assertDestination(dto.destinationId);

    return TouristSpotResponseDto.from(
      await this.repository.create({
        ...dto,
        createdBy: user.id,
        status: await this.moderation.statusFor(user),
      }),
    );
  }

  async update(
    id: string,
    dto: UpdateTouristSpotDto,
    user: AuthenticatedUser,
  ): Promise<TouristSpotResponseDto> {
    const reopened = await this.moderation.assertCanChange(
      await this.getOrFail(id),
      user,
    );
    await this.assertDestination(dto.destinationId);

    return TouristSpotResponseDto.from(
      await this.repository.update(id, { ...dto, ...reopened }),
    );
  }

  approve(
    id: string,
    user: AuthenticatedUser,
  ): Promise<TouristSpotResponseDto> {
    return this.decide(id, user, 'APPROVED');
  }

  reject(
    id: string,
    reason: string,
    user: AuthenticatedUser,
  ): Promise<TouristSpotResponseDto> {
    return this.decide(id, user, 'REJECTED', reason);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    await this.moderation.assertCanChange(await this.getOrFail(id), user);
    await this.repository.remove(id);
  }

  /** For the other modules: a spot they may point at, i.e. a published one. */
  async getApprovedOrFail(id: string): Promise<TouristSpot> {
    const found = await this.repository.findById(id);

    if (!found || found.status !== 'APPROVED') {
      throw new NotFoundException(`Tourist spot with id "${id}" not found`);
    }

    return found;
  }

  private async assertDestination(destinationId?: string): Promise<void> {
    if (destinationId) {
      await this.destinations.getApprovedOrFail(destinationId);
    }
  }

  private async decide(
    id: string,
    user: AuthenticatedUser,
    decision: 'APPROVED' | 'REJECTED',
    reason?: string,
  ): Promise<TouristSpotResponseDto> {
    const entry = await this.getOrFail(id);

    return TouristSpotResponseDto.from(
      await this.moderation.review(
        'TOURIST_SPOT',
        entry,
        decision,
        user,
        () =>
          this.repository.update(id, {
            status: decision,
            rejectionReason: reason ?? null,
            reviewedBy: user.id,
            reviewedAt: new Date(),
          }),
        reason,
      ),
    );
  }

  private async page(
    query: PaginationQueryDto,
    filter: TouristSpotFilter,
    sort: TouristSpotSort,
  ): Promise<PaginatedResponseDto<TouristSpotResponseDto>> {
    const { page, limit, skip, take } = toPageRequest(query);
    const { items, total } = await this.repository.findAll(
      { skip, take },
      filter,
      sort,
    );

    return {
      data: items.map((item) => TouristSpotResponseDto.from(item)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  private async getOrFail(id: string): Promise<TouristSpot> {
    const found = await this.repository.findById(id);

    if (!found) {
      throw new NotFoundException(`Tourist spot with id "${id}" not found`);
    }

    return found;
  }
}
