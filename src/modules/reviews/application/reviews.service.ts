import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { assertOwner } from '../../../shared/http/assert-owner.js';
import {
  buildPaginationMeta,
  type PaginatedResponseDto,
} from '../../../shared/http/dto/paginated-response.dto.js';
import { toPageRequest } from '../../../shared/http/dto/pagination-query.dto.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import { TouristSpotsService } from '../../tourist-spots/application/tourist-spots.service.js';
import type { Review } from '../domain/review.entity.js';
import { ReviewRepository } from '../domain/review.repository.js';
import { isFutureVisit, parseVisitDate } from '../domain/visit-date.js';
import type { CreateReviewDto } from './dto/create-review.dto.js';
import type { ListReviewsQueryDto } from './dto/list-reviews-query.dto.js';
import { ReviewResponseDto } from './dto/review-response.dto.js';
import type { UpdateReviewDto } from './dto/update-review.dto.js';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly repository: ReviewRepository,
    private readonly spots: TouristSpotsService,
  ) {}

  async findAll(
    query: ListReviewsQueryDto,
  ): Promise<PaginatedResponseDto<ReviewResponseDto>> {
    const { page, limit, skip, take } = toPageRequest(query);
    const { items, total } = await this.repository.findAll(
      { skip, take },
      {
        touristSpotId: query.touristSpotId,
        userId: query.userId,
        minRating: query.minRating,
      },
    );

    return {
      data: items.map((item) => ReviewResponseDto.from(item)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async findOne(id: string): Promise<ReviewResponseDto> {
    return ReviewResponseDto.from(await this.getOrFail(id));
  }

  /**
   * The author is always the caller. Reviewing your own spot would let anyone
   * inflate the places they registered, so the creator is refused.
   */
  async create(
    dto: CreateReviewDto,
    user: AuthenticatedUser,
  ): Promise<ReviewResponseDto> {
    const spot = await this.spots.getApprovedOrFail(dto.touristSpotId);

    if (spot.createdBy === user.id) {
      throw new ForbiddenException(
        'You cannot review a tourist spot you registered',
      );
    }

    return ReviewResponseDto.from(
      await this.repository.create({
        userId: user.id,
        touristSpotId: dto.touristSpotId,
        rating: dto.rating,
        comment: dto.comment,
        visitedAt: this.visitDate(dto.visitedAt),
      }),
    );
  }

  async update(
    id: string,
    dto: UpdateReviewDto,
    user: AuthenticatedUser,
  ): Promise<ReviewResponseDto> {
    await this.getOwnedOrFail(id, user);

    return ReviewResponseDto.from(
      await this.repository.update(id, {
        rating: dto.rating,
        comment: dto.comment,
        visitedAt: this.visitDate(dto.visitedAt),
      }),
    );
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    await this.getOwnedOrFail(id, user);
    await this.repository.remove(id);
  }

  private visitDate(day?: string): Date | undefined {
    if (day === undefined) return undefined;

    const visitedAt = parseVisitDate(day);

    if (!visitedAt) {
      throw new UnprocessableEntityException(['visitedAt must be a real day']);
    }
    if (isFutureVisit(visitedAt)) {
      throw new UnprocessableEntityException([
        'visitedAt must not be in the future',
      ]);
    }

    return visitedAt;
  }

  private async getOwnedOrFail(id: string, user: AuthenticatedUser) {
    const found = await this.getOrFail(id);

    assertOwner(found.userId, user, 'Only the author can change this review');

    return found;
  }

  private async getOrFail(id: string): Promise<Review> {
    const found = await this.repository.findById(id);

    if (!found) {
      throw new NotFoundException(`Review with id "${id}" not found`);
    }

    return found;
  }
}
