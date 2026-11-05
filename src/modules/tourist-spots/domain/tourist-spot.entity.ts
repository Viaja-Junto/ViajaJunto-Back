import type { Moderated } from '../../../shared/domain/moderation.js';

export const SPOT_CATEGORIES = [
  'NATURE',
  'BEACH',
  'PARK',
  'MUSEUM',
  'MONUMENT',
  'HISTORICAL',
  'ENTERTAINMENT',
  'OTHER',
] as const;

export type SpotCategory = (typeof SPOT_CATEGORIES)[number];

export interface TouristSpot extends Moderated {
  id: string;
  name: string;
  description: string | null;
  category: SpotCategory;
  address: string | null;
  city: string;
  state: string | null;
  country: string;
  /** ISO 3166-1 alpha-2 code of the country, upper-case. */
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
  photoUrl: string | null;
  /** Derived from the reviews; never set through the API. */
  averageRating: number | null;
  reviewCount: number;
  /** The destination (city) the spot is in, when known. */
  destinationId: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
