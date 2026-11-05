import { Injectable, NotFoundException } from '@nestjs/common';
import type { Page } from '@shared/domain/pagination.js';
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
import type { AuthenticatedUser } from '@modules/auth/domain/authenticated-user.entity.js';
import { ModerationService } from '@modules/moderation/application/moderation.service.js';
import type { Destination } from '../domain/destination.entity.js';
import {
  DestinationRepository,
  type DestinationFilter,
} from '../domain/destination.repository.js';
import type { CreateDestinationDto } from './dto/create-destination.dto.js';
import { DestinationDetailsResponseDto } from './dto/destination-details-response.dto.js';
import { DestinationResponseDto } from './dto/destination-response.dto.js';
import type { ListDestinationsQueryDto } from './dto/list-destinations-query.dto.js';
import type { UpdateDestinationDto } from './dto/update-destination.dto.js';

/** How many reviews the public page shows. */
export const LATEST_REVIEWS = 10;

@Injectable()
export class DestinationsService {
  constructor(
    private readonly repository: DestinationRepository,
    private readonly moderation: ModerationService,
    private readonly photos: PhotoStorageService,
  ) {}

  /** Public: only approved destinations. */
  findAll(
    query: ListDestinationsQueryDto,
  ): Promise<PaginatedResponseDto<DestinationResponseDto>> {
    return this.page(query, {
      text: query.q,
      country: query.country,
      category: query.category,
      status: 'APPROVED',
    });
  }

  /** The caller's own suggestions, whatever their state. */
  findMine(
    query: MySubmissionsQueryDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<DestinationResponseDto>> {
    return this.page(query, { createdBy: user.id, status: query.status });
  }

  /** The administrators' review queue. */
  async findForModeration(
    query: ModerationQueryDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<DestinationResponseDto>> {
    await this.moderation.assertAdmin(user);

    return this.page(query, { status: query.status ?? 'PENDING' });
  }

  async findTop(limit: number): Promise<DestinationResponseDto[]> {
    return (await this.repository.findTopRated(limit)).map((destination) =>
      DestinationResponseDto.from(destination),
    );
  }

  async findOne(id: string): Promise<DestinationResponseDto> {
    return DestinationResponseDto.from(await this.getApprovedOrFail(id));
  }

  async create(
    dto: CreateDestinationDto,
    user: AuthenticatedUser,
  ): Promise<DestinationResponseDto> {
    return DestinationResponseDto.from(
      await this.repository.create({
        ...dto,
        createdBy: user.id,
        status: await this.moderation.statusFor(user),
      }),
    );
  }

  async update(
    id: string,
    dto: UpdateDestinationDto,
    user: AuthenticatedUser,
  ): Promise<DestinationResponseDto> {
    const reopened = await this.moderation.assertCanChange(
      await this.getOrFail(id),
      user,
    );

    return DestinationResponseDto.from(
      await this.repository.update(id, { ...dto, ...reopened }),
    );
  }

  async approve(
    id: string,
    user: AuthenticatedUser,
  ): Promise<DestinationResponseDto> {
    return this.decide(id, user, 'APPROVED');
  }

  async reject(
    id: string,
    reason: string,
    user: AuthenticatedUser,
  ): Promise<DestinationResponseDto> {
    return this.decide(id, user, 'REJECTED', reason);
  }

  /**
   * Uploads a new photo and points the entry at it; the previous photo is
   * deleted once the entry is saved. Same permission as editing.
   */
  async updatePhoto(
    id: string,
    photo: UploadedPhoto,
    user: AuthenticatedUser,
  ): Promise<DestinationResponseDto> {
    const current = await this.getOrFail(id);
    const reopened = await this.moderation.assertCanChange(current, user);

    return DestinationResponseDto.from(
      await this.photos.replace({
        folder: 'destinations',
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

  /** The public page: a published entry with its latest reviews. */
  async findDetails(id: string): Promise<DestinationDetailsResponseDto> {
    const entry = await this.getApprovedOrFail(id);

    return DestinationDetailsResponseDto.fromDetails(
      entry,
      await this.repository.findLatestReviews(id, LATEST_REVIEWS),
    );
  }

  /** For the other modules: a destination they may point at, i.e. a published one. */
  async getApprovedOrFail(id: string): Promise<Destination> {
    const found = await this.repository.findById(id);

    if (!found || found.status !== 'APPROVED') {
      throw new NotFoundException(`Destination with id "${id}" not found`);
    }

    return found;
  }

  private async decide(
    id: string,
    user: AuthenticatedUser,
    decision: 'APPROVED' | 'REJECTED',
    reason?: string,
  ): Promise<DestinationResponseDto> {
    const entry = await this.getOrFail(id);

    return DestinationResponseDto.from(
      await this.moderation.review(
        'DESTINATION',
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
    filter: DestinationFilter,
  ): Promise<PaginatedResponseDto<DestinationResponseDto>> {
    const { page, limit, skip, take } = toPageRequest(query);
    const { items, total }: Page<Destination> = await this.repository.findAll(
      { skip, take },
      filter,
    );

    return {
      data: items.map((item) => DestinationResponseDto.from(item)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  private async getOrFail(id: string): Promise<Destination> {
    const found = await this.repository.findById(id);

    if (!found) {
      throw new NotFoundException(`Destination with id "${id}" not found`);
    }

    return found;
  }
}
