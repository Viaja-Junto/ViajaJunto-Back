import { describe, expect, it } from 'vitest';
import { buildDestinationWhere } from './destination.filters.js';

describe('buildDestinationWhere', () => {
  it('adds no condition when nothing is filtered', () => {
    expect(buildDestinationWhere({})).toEqual({});
  });

  it('matches the name case-insensitively as a substring', () => {
    expect(buildDestinationWhere({ text: 'gram' })).toEqual({
      AND: [{ name: { contains: 'gram', mode: 'insensitive' } }],
    });
  });

  it('matches the country by name or by ISO code', () => {
    expect(buildDestinationWhere({ country: 'br' })).toEqual({
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

  it('filters by category, status and author', () => {
    expect(
      buildDestinationWhere({
        category: 'BEACH',
        status: 'APPROVED',
        createdBy: 'ana',
      }),
    ).toEqual({
      AND: [
        { category: 'BEACH' },
        { status: 'APPROVED' },
        { createdBy: 'ana' },
      ],
    });
  });

  it('matches wildcards literally, because ILIKE would not', () => {
    expect(buildDestinationWhere({ text: '100%' })).toEqual({
      AND: [{ name: { contains: '100\\%', mode: 'insensitive' } }],
    });
  });
});
