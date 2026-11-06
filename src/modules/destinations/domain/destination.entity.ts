import type { Moderated } from '../../../shared/domain/moderation.js';

export const DESTINATION_CATEGORIES = [
  'CITY',
  'BEACH',
  'NATURE',
  'CULTURAL',
] as const;

export type DestinationCategory = (typeof DESTINATION_CATEGORIES)[number];

export interface Destination extends Moderated {
  id: string;
  name: string;
  country: string;
  /** ISO 3166-1 alpha-2 code of the country, upper-case. */
  countryCode: string | null;
  category: DestinationCategory | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  photoUrl: string | null;
  /** Derived from the destination reviews; never set through the API. */
  averageRating: number | null;
  reviewCount: number;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
