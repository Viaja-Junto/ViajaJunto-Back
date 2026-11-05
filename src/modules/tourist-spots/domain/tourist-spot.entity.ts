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

export interface TouristSpot {
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
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
