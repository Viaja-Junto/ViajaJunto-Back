import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TouristSpotsService } from '../../tourist-spots/application/tourist-spots.service.js';
import type { Review } from '../domain/review.entity.js';
import type { ReviewRepository } from '../domain/review.repository.js';
import { ReviewsService } from './reviews.service.js';

const SPOT_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

const base: Review = {
  id: '99999999-9999-4999-8999-999999999999',
  userId: '11111111-1111-4111-8111-111111111111',
  touristSpotId: SPOT_ID,
  rating: 5,
  comment: null,
  visitedAt: null,
  createdAt: new Date('2026-11-01T19:45:00.000Z'),
  updatedAt: new Date('2026-11-01T19:45:00.000Z'),
};

const entity = (overrides: Partial<Review> = {}): Review => ({
  ...base,
  ...overrides,
});

describe('ReviewsService', () => {
  const author = { id: base.userId, email: 'ana@example.com' };
  const creator = {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'bia@example.com',
  };
  const stranger = {
    id: '33333333-3333-4333-8333-333333333333',
    email: 'eve@example.com',
  };

  let repository: Record<keyof ReviewRepository, ReturnType<typeof vi.fn>>;
  let spots: { getApprovedOrFail: ReturnType<typeof vi.fn> };
  let service: ReviewsService;

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-11-05T14:00:00.000Z') });
    repository = {
      findAll: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      findById: vi.fn(),
      create: vi.fn().mockResolvedValue(base),
      update: vi.fn().mockResolvedValue(base),
      remove: vi.fn(),
    };
    spots = {
      getApprovedOrFail: vi
        .fn()
        .mockResolvedValue({ id: SPOT_ID, createdBy: creator.id }),
    };
    service = new ReviewsService(
      repository as unknown as ReviewRepository,
      spots as unknown as TouristSpotsService,
    );
  });

  afterEach(() => vi.useRealTimers());

  describe('findAll', () => {
    it('turns page and limit into a skip/take window and passes the filters', async () => {
      await service.findAll({
        page: 2,
        limit: 10,
        touristSpotId: SPOT_ID,
        userId: author.id,
        minRating: 4,
      });

      expect(repository.findAll).toHaveBeenCalledWith(
        { skip: 10, take: 10 },
        { touristSpotId: SPOT_ID, userId: author.id, minRating: 4 },
      );
    });

    it('wraps the page in the { data, meta } envelope', async () => {
      repository.findAll.mockResolvedValue({ items: [entity()], total: 1 });

      const result = await service.findAll({});

      expect(result.data).toHaveLength(1);
      expect(result.meta).toMatchObject({ page: 1, limit: 20, total: 1 });
    });
  });

  describe('findOne', () => {
    it('writes the visit day back as YYYY-MM-DD', async () => {
      repository.findById.mockResolvedValue(
        entity({ visitedAt: new Date('2026-10-12T00:00:00.000Z') }),
      );

      await expect(service.findOne(base.id)).resolves.toMatchObject({
        visitedAt: '2026-10-12',
      });
    });

    it('throws NotFoundException when the review does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne(base.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('takes the author from the caller and the visit day as a date', async () => {
      await service.create(
        {
          touristSpotId: SPOT_ID,
          rating: 4,
          comment: 'Vale a pena',
          visitedAt: '2026-10-12',
        },
        author,
      );

      expect(repository.create).toHaveBeenCalledWith({
        userId: author.id,
        touristSpotId: SPOT_ID,
        rating: 4,
        comment: 'Vale a pena',
        visitedAt: new Date('2026-10-12T00:00:00.000Z'),
      });
    });

    it('ignores an author smuggled into the payload', async () => {
      await service.create(
        { touristSpotId: SPOT_ID, rating: 5, userId: stranger.id } as never,
        author,
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: author.id }),
      );
    });

    it('answers 404 when the spot does not exist', async () => {
      spots.getApprovedOrFail.mockRejectedValue(new NotFoundException());

      await expect(
        service.create({ touristSpotId: SPOT_ID, rating: 5 }, author),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('forbids the creator of the spot from reviewing it', async () => {
      await expect(
        service.create({ touristSpotId: SPOT_ID, rating: 5 }, creator),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('refuses a visit in the future', async () => {
      await expect(
        service.create(
          { touristSpotId: SPOT_ID, rating: 5, visitedAt: '2026-12-25' },
          author,
        ),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('refuses a day that does not exist', async () => {
      await expect(
        service.create(
          { touristSpotId: SPOT_ID, rating: 5, visitedAt: '2026-02-30' },
          author,
        ),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });
  });

  describe('update', () => {
    it('lets the author change rating, comment and visit day', async () => {
      repository.findById.mockResolvedValue(entity());

      await service.update(
        base.id,
        { rating: 3, comment: 'Mudei de ideia', visitedAt: '2026-10-01' },
        author,
      );

      expect(repository.update).toHaveBeenCalledWith(base.id, {
        rating: 3,
        comment: 'Mudei de ideia',
        visitedAt: new Date('2026-10-01T00:00:00.000Z'),
      });
    });

    it('leaves out what the payload does not change', async () => {
      repository.findById.mockResolvedValue(entity());

      await service.update(base.id, { rating: 3 }, author);

      expect(repository.update).toHaveBeenCalledWith(base.id, {
        rating: 3,
        comment: undefined,
        visitedAt: undefined,
      });
    });

    it('refuses to move the visit into the future', async () => {
      repository.findById.mockResolvedValue(entity());

      await expect(
        service.update(base.id, { visitedAt: '2027-01-01' }, author),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('does not touch the repository when the review is missing', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(base.id, {}, author)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('forbids anyone but the author', async () => {
      repository.findById.mockResolvedValue(entity());

      await expect(
        service.update(base.id, {}, stranger),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('lets the author delete the review', async () => {
      repository.findById.mockResolvedValue(entity());

      await service.remove(base.id, author);

      expect(repository.remove).toHaveBeenCalledWith(base.id);
    });

    it('does not delete when the review is missing', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove(base.id, author)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.remove).not.toHaveBeenCalled();
    });

    it('forbids anyone but the author', async () => {
      repository.findById.mockResolvedValue(entity());

      await expect(service.remove(base.id, stranger)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repository.remove).not.toHaveBeenCalled();
    });
  });
});
