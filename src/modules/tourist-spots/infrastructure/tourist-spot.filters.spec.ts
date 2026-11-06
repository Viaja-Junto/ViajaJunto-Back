import { describe, expect, it } from 'vitest';
import {
  buildTouristSpotOrderBy,
  buildTouristSpotWhere,
} from './tourist-spot.filters.js';

describe('buildTouristSpotWhere', () => {
  it('adds no condition when nothing is filtered', () => {
    expect(buildTouristSpotWhere({})).toEqual({});
  });

  it('matches the name case-insensitively as a substring', () => {
    expect(buildTouristSpotWhere({ text: 'parque' })).toEqual({
      AND: [{ name: { contains: 'parque', mode: 'insensitive' } }],
    });
  });

  it('matches the whole city name, case-insensitively', () => {
    expect(buildTouristSpotWhere({ city: 'porto alegre' })).toEqual({
      AND: [{ city: { equals: 'porto alegre', mode: 'insensitive' } }],
    });
  });

  it('matches the country by name or by ISO code', () => {
    expect(buildTouristSpotWhere({ country: 'br' })).toEqual({
      AND: [
        {
          OR: [
            { country: { equals: 'br', mode: 'insensitive' } },
            { countryCode: { equals: 'br', mode: 'insensitive' } },
          ],
        },
      ],
    });
  });

  it('filters by category', () => {
    expect(buildTouristSpotWhere({ category: 'PARK' })).toEqual({
      AND: [{ category: 'PARK' }],
    });
  });

  it('keeps only spots rated at least minRating', () => {
    expect(buildTouristSpotWhere({ minRating: 4 })).toEqual({
      AND: [{ averageRating: { gte: 4 } }],
    });
  });

  it('filters by destination, status and author', () => {
    expect(
      buildTouristSpotWhere({
        destinationId: 'd',
        status: 'APPROVED',
        createdBy: 'ana',
      }),
    ).toEqual({
      AND: [
        { destinationId: 'd' },
        { status: 'APPROVED' },
        { createdBy: 'ana' },
      ],
    });
  });

  it('combines every filter with AND', () => {
    const where = buildTouristSpotWhere({
      text: 'a',
      city: 'Porto Alegre',
      country: 'Brasil',
      category: 'PARK',
      minRating: 3,
    });

    expect(where.AND).toHaveLength(5);
  });

  it('matches wildcards literally, because ILIKE would not', () => {
    expect(buildTouristSpotWhere({ text: '100%', city: 'Sa_o' })).toEqual({
      AND: [
        { name: { contains: '100\\%', mode: 'insensitive' } },
        { city: { equals: 'Sa\\_o', mode: 'insensitive' } },
      ],
    });
  });
});

describe('buildTouristSpotOrderBy', () => {
  it.each(['newest', 'rating', 'name'] as const)(
    'ends %s on the id, so pages are stable',
    (sort) => {
      expect(buildTouristSpotOrderBy(sort).at(-1)).toEqual({ id: 'asc' });
    },
  );

  it('puts the newest first by default', () => {
    expect(buildTouristSpotOrderBy('newest')[0]).toEqual({ createdAt: 'desc' });
  });

  it('puts unrated spots last when sorting by rating', () => {
    expect(buildTouristSpotOrderBy('rating').slice(0, 2)).toEqual([
      { averageRating: { sort: 'desc', nulls: 'last' } },
      { reviewCount: 'desc' },
    ]);
  });

  it('sorts alphabetically by name', () => {
    expect(buildTouristSpotOrderBy('name')[0]).toEqual({ name: 'asc' });
  });
});
