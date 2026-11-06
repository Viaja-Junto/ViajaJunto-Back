import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DestinationsService } from '../../destinations/application/destinations.service.js';
import type { ModerationService } from '../../moderation/application/moderation.service.js';
import type { TouristSpot } from '../domain/tourist-spot.entity.js';
import type { TouristSpotRepository } from '../domain/tourist-spot.repository.js';
import { TouristSpotsService } from './tourist-spots.service.js';

const base: TouristSpot = {
  id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  name: 'Usina do Gasômetro',
  description: null,
  category: 'HISTORICAL',
  address: null,
  city: 'Porto Alegre',
  state: 'RS',
  country: 'Brasil',
  countryCode: 'BR',
  latitude: -30.034647,
  longitude: -51.241455,
  photoUrl: null,
  averageRating: null,
  reviewCount: 0,
  destinationId: null,
  status: 'APPROVED',
  rejectionReason: null,
  createdBy: '11111111-1111-4111-8111-111111111111',
  reviewedBy: null,
  reviewedAt: null,
  createdAt: new Date('2026-11-05T14:00:00.000Z'),
  updatedAt: new Date('2026-11-05T14:00:00.000Z'),
};

const entity = (overrides: Partial<TouristSpot> = {}): TouristSpot => ({
  ...base,
  ...overrides,
});

const ana = { id: base.createdBy!, email: 'ana@example.com' };
const admin = { id: 'root', email: 'admin@example.com' };

describe('TouristSpotsService', () => {
  let repository: Record<keyof TouristSpotRepository, ReturnType<typeof vi.fn>>;
  let moderation: Record<
    'statusFor' | 'assertAdmin' | 'assertCanChange' | 'review',
    ReturnType<typeof vi.fn>
  >;
  let destinations: { getApprovedOrFail: ReturnType<typeof vi.fn> };
  let service: TouristSpotsService;

  beforeEach(() => {
    repository = {
      findAll: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      findById: vi.fn().mockResolvedValue(entity()),
      findTopRated: vi.fn(),
      create: vi.fn().mockResolvedValue(entity()),
      update: vi.fn().mockResolvedValue(entity()),
      remove: vi.fn(),
      findLatestReviews: vi.fn().mockResolvedValue([
        {
          id: 'r1',
          rating: 5,
          comment: 'Lindo',
          createdAt: new Date('2026-11-01T00:00:00.000Z'),
          authorName: 'Ana',
        },
      ]),
    };
    moderation = {
      statusFor: vi.fn().mockResolvedValue('PENDING'),
      assertAdmin: vi.fn(),
      assertCanChange: vi.fn().mockResolvedValue(null),
      review: vi.fn((_kind, _entry, _decision, _user, save) => save()),
    };
    destinations = { getApprovedOrFail: vi.fn() };
    service = new TouristSpotsService(
      repository as unknown as TouristSpotRepository,
      moderation as unknown as ModerationService,
      destinations as unknown as DestinationsService,
    );
  });

  describe('listing', () => {
    it('shows the public only approved spots, with every filter and the sort', async () => {
      await service.findAll({
        page: 3,
        limit: 15,
        q: 'usina',
        city: 'Porto Alegre',
        country: 'BR',
        category: 'HISTORICAL',
        minRating: 4,
        destinationId: 'd',
        sort: 'rating',
      });

      expect(repository.findAll).toHaveBeenCalledWith(
        { skip: 30, take: 15 },
        {
          text: 'usina',
          city: 'Porto Alegre',
          country: 'BR',
          category: 'HISTORICAL',
          minRating: 4,
          destinationId: 'd',
          status: 'APPROVED',
        },
        'rating',
      );
    });

    it('wraps the page in the { data, meta } envelope', async () => {
      repository.findAll.mockResolvedValue({ items: [entity()], total: 41 });

      const result = await service.findAll({ page: 2, limit: 20 });

      expect(result.data).toEqual([
        expect.objectContaining({ id: base.id, status: 'APPROVED' }),
      ]);
      expect(result.meta).toMatchObject({
        total: 41,
        totalPages: 3,
        hasNext: true,
      });
    });

    it('lists the caller’s own suggestions in any state', async () => {
      await service.findMine({ status: 'REJECTED' }, ana);

      expect(repository.findAll).toHaveBeenCalledWith(
        { skip: 0, take: 20 },
        { createdBy: ana.id, status: 'REJECTED' },
        'newest',
      );
    });

    it('opens the review queue to administrators only, pending by default', async () => {
      await service.findForModeration({}, admin);

      expect(moderation.assertAdmin).toHaveBeenCalledWith(admin);
      expect(repository.findAll).toHaveBeenCalledWith(
        { skip: 0, take: 20 },
        { status: 'PENDING' },
        'newest',
      );
    });

    it('lists the top rated spots in the order the repository gives', async () => {
      repository.findTopRated.mockResolvedValue([
        entity({ id: 'a' }),
        entity({ id: 'b' }),
      ]);

      expect((await service.findTop(2)).map((spot) => spot.id)).toEqual([
        'a',
        'b',
      ]);
    });
  });

  describe('findOne', () => {
    it('returns an approved spot', async () => {
      await expect(service.findOne(base.id)).resolves.toMatchObject({
        id: base.id,
      });
    });

    it.each(['PENDING', 'REJECTED'] as const)(
      'hides a %s spot behind a 404',
      async (status) => {
        repository.findById.mockResolvedValue(entity({ status }));

        await expect(service.findOne(base.id)).rejects.toBeInstanceOf(
          NotFoundException,
        );
      },
    );

    it('answers 404 when the spot does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne(base.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('takes the author from the caller and the status from their role', async () => {
      await service.create(
        { name: base.name, city: base.city, country: base.country },
        ana,
      );

      expect(repository.create).toHaveBeenCalledWith({
        name: base.name,
        city: base.city,
        country: base.country,
        createdBy: ana.id,
        status: 'PENDING',
      });
    });

    it('ignores an author or a status smuggled into the payload', async () => {
      await service.create(
        {
          name: 'X',
          city: 'Y',
          country: 'Z',
          createdBy: 'eve',
          status: 'APPROVED',
        } as never,
        ana,
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ createdBy: ana.id, status: 'PENDING' }),
      );
    });

    it('only links a published destination', async () => {
      destinations.getApprovedOrFail.mockRejectedValue(new NotFoundException());

      await expect(
        service.create(
          { name: 'X', city: 'Y', country: 'Z', destinationId: 'd' },
          ana,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('applies the change and what moderation does to the status', async () => {
      moderation.assertCanChange.mockResolvedValue({
        status: 'PENDING',
        rejectionReason: null,
      });

      await service.update(base.id, { name: 'Gasômetro' }, ana);

      expect(moderation.assertCanChange).toHaveBeenCalledWith(entity(), ana);
      expect(repository.update).toHaveBeenCalledWith(base.id, {
        name: 'Gasômetro',
        status: 'PENDING',
        rejectionReason: null,
      });
    });

    it('does not touch the repository when moderation refuses', async () => {
      moderation.assertCanChange.mockRejectedValue(new Error('403'));

      await expect(service.update(base.id, {}, ana)).rejects.toThrow('403');
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown spot', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(base.id, {}, ana)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('moderation decisions', () => {
    it('approves through the moderation rules and records the reviewer', async () => {
      await service.approve(base.id, admin);

      expect(moderation.review).toHaveBeenCalledWith(
        'TOURIST_SPOT',
        entity(),
        'APPROVED',
        admin,
        expect.any(Function),
        undefined,
      );
      expect(repository.update).toHaveBeenCalledWith(base.id, {
        status: 'APPROVED',
        rejectionReason: null,
        reviewedBy: admin.id,
        reviewedAt: expect.any(Date),
      });
    });

    it('rejects with the reason', async () => {
      await service.reject(base.id, 'Duplicado', admin);

      expect(repository.update).toHaveBeenCalledWith(
        base.id,
        expect.objectContaining({
          status: 'REJECTED',
          rejectionReason: 'Duplicado',
        }),
      );
    });
  });

  describe('remove', () => {
    it('deletes once moderation allows it', async () => {
      await service.remove(base.id, ana);

      expect(repository.remove).toHaveBeenCalledWith(base.id);
    });

    it('does not delete when moderation refuses', async () => {
      moderation.assertCanChange.mockRejectedValue(new Error('403'));

      await expect(service.remove(base.id, ana)).rejects.toThrow('403');
      expect(repository.remove).not.toHaveBeenCalled();
    });
  });

  it('shows the public page with the 10 latest reviews', async () => {
    const details = await service.findDetails(base.id);

    expect(repository.findLatestReviews).toHaveBeenCalledWith(base.id, 10);
    expect(details).toMatchObject({
      id: base.id,
      latestReviews: [{ id: 'r1', authorName: 'Ana', rating: 5 }],
    });
  });
});
