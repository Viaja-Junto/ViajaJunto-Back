import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  createdBy: '11111111-1111-4111-8111-111111111111',
  createdAt: new Date('2026-11-05T14:00:00.000Z'),
  updatedAt: new Date('2026-11-05T14:00:00.000Z'),
};

const entity = (overrides: Partial<TouristSpot> = {}): TouristSpot => ({
  ...base,
  ...overrides,
});

describe('TouristSpotsService', () => {
  const creator = { id: base.createdBy, email: 'ana@example.com' };
  const stranger = {
    id: '99999999-9999-4999-8999-999999999999',
    email: 'eve@example.com',
  };

  let repository: Record<keyof TouristSpotRepository, ReturnType<typeof vi.fn>>;
  let service: TouristSpotsService;

  beforeEach(() => {
    repository = {
      findAll: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      findById: vi.fn(),
      findTopRated: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };
    service = new TouristSpotsService(
      repository as unknown as TouristSpotRepository,
    );
  });

  describe('findAll', () => {
    it('turns page and limit into a skip/take window', async () => {
      await service.findAll({ page: 3, limit: 15 });

      expect(repository.findAll).toHaveBeenCalledWith(
        { skip: 30, take: 15 },
        expect.any(Object),
        'newest',
      );
    });

    it('passes every filter and the sort to the repository', async () => {
      await service.findAll({
        q: 'usina',
        city: 'Porto Alegre',
        country: 'BR',
        category: 'HISTORICAL',
        minRating: 4,
        sort: 'rating',
      });

      expect(repository.findAll).toHaveBeenCalledWith(
        { skip: 0, take: 20 },
        {
          text: 'usina',
          city: 'Porto Alegre',
          country: 'BR',
          category: 'HISTORICAL',
          minRating: 4,
        },
        'rating',
      );
    });

    it('wraps the page in the { data, meta } envelope', async () => {
      repository.findAll.mockResolvedValue({ items: [entity()], total: 41 });

      const result = await service.findAll({ page: 2, limit: 20 });

      expect(result.data).toEqual([expect.objectContaining({ id: base.id })]);
      expect(result.meta).toEqual({
        page: 2,
        limit: 20,
        total: 41,
        totalPages: 3,
        hasNext: true,
        hasPrevious: true,
      });
    });
  });

  it('lists the top rated spots in the order the repository gives', async () => {
    repository.findTopRated.mockResolvedValue([
      entity({ id: 'a', averageRating: 5 }),
      entity({ id: 'b', averageRating: 4 }),
    ]);

    const result = await service.findTop(2);

    expect(repository.findTopRated).toHaveBeenCalledWith(2);
    expect(result.map((spot) => spot.id)).toEqual(['a', 'b']);
  });

  describe('findOne', () => {
    it('returns the mapped response', async () => {
      repository.findById.mockResolvedValue(entity());

      await expect(service.findOne(base.id)).resolves.toMatchObject({
        id: base.id,
        name: base.name,
      });
    });

    it('throws NotFoundException when the spot does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne(base.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('takes the creator from the authenticated caller', async () => {
      repository.create.mockResolvedValue(entity());

      await service.create(
        { name: base.name, city: base.city, country: base.country },
        creator,
      );

      expect(repository.create).toHaveBeenCalledWith({
        name: base.name,
        city: base.city,
        country: base.country,
        createdBy: creator.id,
      });
    });

    it('ignores a creator smuggled into the payload', async () => {
      repository.create.mockResolvedValue(entity());

      await service.create(
        {
          name: base.name,
          city: base.city,
          country: base.country,
          createdBy: stranger.id,
        } as never,
        creator,
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ createdBy: creator.id }),
      );
    });
  });

  describe('update', () => {
    it('lets the creator update the spot', async () => {
      repository.findById.mockResolvedValue(entity());
      repository.update.mockResolvedValue(entity({ name: 'Gasômetro' }));

      const result = await service.update(
        base.id,
        { name: 'Gasômetro' },
        creator,
      );

      expect(repository.update).toHaveBeenCalledWith(base.id, {
        name: 'Gasômetro',
      });
      expect(result.name).toBe('Gasômetro');
    });

    it('does not touch the repository when the spot is missing', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(base.id, {}, creator)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('forbids anyone but the creator', async () => {
      repository.findById.mockResolvedValue(entity());

      await expect(
        service.update(base.id, {}, stranger),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('lets the creator delete the spot', async () => {
      repository.findById.mockResolvedValue(entity());

      await service.remove(base.id, creator);

      expect(repository.remove).toHaveBeenCalledWith(base.id);
    });

    it('does not delete when the spot is missing', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove(base.id, creator)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.remove).not.toHaveBeenCalled();
    });

    it('forbids anyone but the creator', async () => {
      repository.findById.mockResolvedValue(entity());

      await expect(service.remove(base.id, stranger)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repository.remove).not.toHaveBeenCalled();
    });
  });
});
