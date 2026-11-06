import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '@shared/domain/errors.js';
import type { Destination } from '@modules/destinations/domain/destination.entity.js';
import type { DestinationsService } from '@modules/destinations/application/destinations.service.js';
import type { TouristSpot } from '@modules/tourist-spots/domain/tourist-spot.entity.js';
import type { TouristSpotsService } from '@modules/tourist-spots/application/tourist-spots.service.js';
import type { FavoriteRepository } from '../domain/favorite.repository.js';
import { FavoritesService } from './favorites.service.js';

const stamp = new Date('2026-11-05T14:00:00.000Z');
const moderated = {
  status: 'APPROVED' as const,
  rejectionReason: null,
  createdBy: 'ana',
  reviewedBy: null,
  reviewedAt: null,
  createdAt: stamp,
  updatedAt: stamp,
};
const gramado: Destination = {
  id: '7d1f0c2a-5b3e-4f6a-8c9d-0e1f2a3b4c5d',
  name: 'Gramado',
  country: 'Brasil',
  countryCode: 'BR',
  category: 'NATURE',
  description: null,
  latitude: null,
  longitude: null,
  photoUrl: null,
  averageRating: null,
  reviewCount: 0,
  ...moderated,
};
const gasometro: TouristSpot = {
  id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  name: 'Usina do Gasômetro',
  description: null,
  category: 'HISTORICAL',
  address: null,
  city: 'Porto Alegre',
  state: 'RS',
  country: 'Brasil',
  countryCode: 'BR',
  latitude: null,
  longitude: null,
  photoUrl: null,
  averageRating: null,
  reviewCount: 0,
  destinationId: null,
  ...moderated,
};
const user = { id: 'ana', email: 'ana@example.com' };

describe('FavoritesService', () => {
  let repository: { [K in keyof FavoriteRepository]: ReturnType<typeof vi.fn> };
  let destinations: { getApprovedOrFail: ReturnType<typeof vi.fn> };
  let touristSpots: { getApprovedOrFail: ReturnType<typeof vi.fn> };
  let service: FavoritesService;

  beforeEach(() => {
    repository = {
      add: vi.fn(),
      remove: vi.fn(),
      ids: vi.fn(),
      listDestinations: vi.fn(),
      listTouristSpots: vi.fn(),
    };
    destinations = { getApprovedOrFail: vi.fn().mockResolvedValue(gramado) };
    touristSpots = { getApprovedOrFail: vi.fn().mockResolvedValue(gasometro) };
    service = new FavoritesService(
      repository as unknown as FavoriteRepository,
      destinations as unknown as DestinationsService,
      touristSpots as unknown as TouristSpotsService,
    );
  });

  it('returns the ids of what the caller saved', async () => {
    repository.ids.mockResolvedValue({
      destinationIds: [gramado.id],
      touristSpotIds: [gasometro.id],
    });

    await expect(service.ids(user)).resolves.toEqual({
      destinationIds: [gramado.id],
      touristSpotIds: [gasometro.id],
    });
    expect(repository.ids).toHaveBeenCalledWith('ana');
  });

  it('pages the saved destinations', async () => {
    repository.listDestinations.mockResolvedValue({
      items: [gramado],
      total: 21,
    });

    const result = await service.listDestinations({ page: 2, limit: 20 }, user);

    expect(repository.listDestinations).toHaveBeenCalledWith('ana', {
      skip: 20,
      take: 20,
    });
    expect(result.data[0]).toMatchObject({ id: gramado.id, name: 'Gramado' });
    expect(result.meta).toMatchObject({ page: 2, total: 21, hasNext: false });
  });

  it('pages the saved tourist spots', async () => {
    repository.listTouristSpots.mockResolvedValue({
      items: [gasometro],
      total: 1,
    });

    const result = await service.listTouristSpots({}, user);

    expect(repository.listTouristSpots).toHaveBeenCalledWith('ana', {
      skip: 0,
      take: 20,
    });
    expect(result.data[0]).toMatchObject({ id: gasometro.id });
  });

  it('saves only a published destination', async () => {
    await service.add('destination', gramado.id, user);

    expect(destinations.getApprovedOrFail).toHaveBeenCalledWith(gramado.id);
    expect(repository.add).toHaveBeenCalledWith(
      'ana',
      'destination',
      gramado.id,
    );
  });

  it('saves only a published tourist spot', async () => {
    await service.add('touristSpot', gasometro.id, user);

    expect(touristSpots.getApprovedOrFail).toHaveBeenCalledWith(gasometro.id);
    expect(repository.add).toHaveBeenCalledWith(
      'ana',
      'touristSpot',
      gasometro.id,
    );
  });

  it('does not save an entry that is not published', async () => {
    touristSpots.getApprovedOrFail.mockRejectedValue(
      new NotFoundError('Not found'),
    );

    await expect(
      service.add('touristSpot', gasometro.id, user),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(repository.add).not.toHaveBeenCalled();
  });

  it('removes without checking the catalog, so a rejected entry can still be removed', async () => {
    await service.remove('destination', gramado.id, user);

    expect(destinations.getApprovedOrFail).not.toHaveBeenCalled();
    expect(repository.remove).toHaveBeenCalledWith(
      'ana',
      'destination',
      gramado.id,
    );
  });
});
