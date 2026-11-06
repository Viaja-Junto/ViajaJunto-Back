import type { Page, PageRequest } from '@shared/domain/pagination.js';
import type { Destination } from '@modules/destinations/domain/destination.entity.js';
import type { TouristSpot } from '@modules/tourist-spots/domain/tourist-spot.entity.js';

export type FavoriteKind = 'destination' | 'touristSpot';

export interface FavoriteIds {
  destinationIds: string[];
  touristSpotIds: string[];
}

export abstract class FavoriteRepository {
  abstract add(userId: string, kind: FavoriteKind, id: string): Promise<void>;
  abstract remove(
    userId: string,
    kind: FavoriteKind,
    id: string,
  ): Promise<void>;
  abstract ids(userId: string): Promise<FavoriteIds>;
  abstract listDestinations(
    userId: string,
    page: PageRequest,
  ): Promise<Page<Destination>>;
  abstract listTouristSpots(
    userId: string,
    page: PageRequest,
  ): Promise<Page<TouristSpot>>;
}
