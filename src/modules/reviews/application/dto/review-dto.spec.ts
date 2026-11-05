import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateReviewDto } from './create-review.dto.js';
import { ListReviewsQueryDto } from './list-reviews-query.dto.js';
import { UpdateReviewDto } from './update-review.dto.js';

const errorsOf = async <T extends object>(
  type: new () => T,
  body: Record<string, unknown>,
) =>
  (await validate(plainToInstance(type, body))).map(({ property }) => property);

const review = {
  touristSpotId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  rating: 5,
};

describe('CreateReviewDto', () => {
  it('accepts a complete payload', async () => {
    expect(
      await errorsOf(CreateReviewDto, {
        ...review,
        comment: 'Vale a pena',
        visitedAt: '2026-10-12',
      }),
    ).toEqual([]);
  });

  it.each([
    ['a rating of 0', { rating: 0 }, 'rating'],
    ['a rating above 5', { rating: 6 }, 'rating'],
    ['a fractional rating', { rating: 3.5 }, 'rating'],
    ['no rating', { rating: undefined }, 'rating'],
    ['a malformed spot id', { touristSpotId: 'abc' }, 'touristSpotId'],
    ['a comment that is too long', { comment: 'x'.repeat(2001) }, 'comment'],
    ['a visit with a time', { visitedAt: '2026-10-12T10:00:00Z' }, 'visitedAt'],
    ['a visit in another format', { visitedAt: '12/10/2026' }, 'visitedAt'],
    [
      'a visit on a day that does not exist',
      { visitedAt: '2026-02-30' },
      'visitedAt',
    ],
  ])('rejects %s', async (_name, overrides, property) => {
    expect(
      await errorsOf(CreateReviewDto, { ...review, ...overrides }),
    ).toEqual([property]);
  });
});

describe('UpdateReviewDto', () => {
  it('accepts a partial change', async () => {
    expect(await errorsOf(UpdateReviewDto, { comment: 'Mudei' })).toEqual([]);
  });

  it('keeps the rating rules', async () => {
    expect(await errorsOf(UpdateReviewDto, { rating: 9 })).toEqual(['rating']);
  });
});

describe('ListReviewsQueryDto', () => {
  it('reads minRating from the query string as a number', () => {
    expect(
      plainToInstance(ListReviewsQueryDto, { minRating: '4' }).minRating,
    ).toBe(4);
  });

  it('rejects a malformed user id', async () => {
    expect(await errorsOf(ListReviewsQueryDto, { userId: 'abc' })).toEqual([
      'userId',
    ]);
  });
});
