import { Injectable } from '@nestjs/common';
import {
  buildPaginationMeta,
  type PaginatedResponseDto,
} from '@shared/http/dto/paginated-response.dto.js';
import {
  toPageRequest,
  type PaginationQueryDto,
} from '@shared/http/dto/pagination-query.dto.js';
import type {
  ModerationQueryDto,
  MySubmissionsQueryDto,
} from '@shared/http/dto/moderation.dto.js';
import { PhotoStorageService } from '@shared/storage/application/photo-storage.service.js';
import type { UploadedPhoto } from '@shared/storage/domain/photo.js';
import type { AuthenticatedUser } from '@shared/domain/authenticated-user.js';
import { DestinationsService } from '@modules/destinations/application/destinations.service.js';
import { ModerationService } from '@modules/moderation/application/moderation.service.js';
import type { TouristSpot } from '../domain/tourist-spot.entity.js';
import {
  TouristSpotRepository,
  type TouristSpotFilter,
  type TouristSpotSort,
} from '../domain/tourist-spot.repository.js';
import type { CreateTouristSpotDto } from './dto/create-tourist-spot.dto.js';
import type { ListTouristSpotsQueryDto } from './dto/list-tourist-spots-query.dto.js';
import { TouristSpotDetailsResponseDto } from './dto/tourist-spot-details-response.dto.js';
import { TouristSpotResponseDto } from './dto/tourist-spot-response.dto.js';
import type { UpdateTouristSpotDto } from './dto/update-tourist-spot.dto.js';
import { NotFoundError } from '@shared/domain/errors.js';

export const LATEST_REVIEWS = 10;

@Injectable()
export class TouristSpotsService {
  constructor(
    private readonly repository: TouristSpotRepository,
    private readonly moderation: ModerationService,
    private readonly photos: PhotoStorageService,
    private readonly destinations: DestinationsService,
  ) {}

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

  async updatePhoto(
    id: string,
    photo: UploadedPhoto,
    user: AuthenticatedUser,
  ): Promise<TouristSpotResponseDto> {
    const current = await this.getOrFail(id);
    const reopened = await this.moderation.assertCanChange(current, user);

    return TouristSpotResponseDto.from(
      await this.photos.replace({
        folder: 'tourist-spots',
        ownerId: id,
        photo,
        previousUrl: current.photoUrl,
        save: (photoUrl) =>
          this.repository.update(id, { photoUrl, ...reopened }),
      }),
    );
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const current = await this.getOrFail(id);
    await this.moderation.assertCanChange(current, user);
    await this.repository.remove(id);
    await this.photos.discard(current.photoUrl);
  }

  async findDetails(id: string): Promise<TouristSpotDetailsResponseDto> {
    const entry = await this.getApprovedOrFail(id);

    return TouristSpotDetailsResponseDto.fromDetails(
      entry,
      await this.repository.findLatestReviews(id, LATEST_REVIEWS),
    );
  }

  async getApprovedOrFail(id: string): Promise<TouristSpot> {
    const found = await this.repository.findById(id);

    if (!found || found.status !== 'APPROVED') {
      throw new NotFoundError(`Tourist spot with id "${id}" not found`);
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
      throw new NotFoundError(`Tourist spot with id "${id}" not found`);
    }

    return found;
  }
}
