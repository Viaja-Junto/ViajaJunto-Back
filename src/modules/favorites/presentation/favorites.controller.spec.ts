import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FavoritesService } from '../application/favorites.service.js';
import { FavoritesController } from './favorites.controller.js';

describe('FavoritesController', () => {
  const id = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
  const user = { id: 'ana', email: 'ana@example.com' };
  const query = { page: 1, limit: 20 };

  let service: { [K in keyof FavoritesService]: ReturnType<typeof vi.fn> };
  let controller: FavoritesController;

  beforeEach(() => {
    service = {
      ids: vi.fn().mockReturnValue('ids'),
      listDestinations: vi.fn().mockReturnValue('destinations'),
      listTouristSpots: vi.fn().mockReturnValue('spots'),
      add: vi.fn(),
      remove: vi.fn(),
    };
    controller = new FavoritesController(
      service as unknown as FavoritesService,
    );
  });

  it('delegates the reads on behalf of the caller', () => {
    expect(controller.ids(user)).toBe('ids');
    expect(controller.destinations(query, user)).toBe('destinations');
    expect(controller.touristSpots(query, user)).toBe('spots');
    expect(service.listDestinations).toHaveBeenCalledWith(query, user);
    expect(service.listTouristSpots).toHaveBeenCalledWith(query, user);
  });

  it('saves and removes each kind of entry', () => {
    controller.addDestination(id, user);
    controller.removeDestination(id, user);
    controller.addTouristSpot(id, user);
    controller.removeTouristSpot(id, user);

    expect(service.add).toHaveBeenNthCalledWith(1, 'destination', id, user);
    expect(service.add).toHaveBeenNthCalledWith(2, 'touristSpot', id, user);
    expect(service.remove).toHaveBeenNthCalledWith(1, 'destination', id, user);
    expect(service.remove).toHaveBeenNthCalledWith(2, 'touristSpot', id, user);
  });
});
