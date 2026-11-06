import { describe, expect, it } from 'vitest';
import { InvalidInputError } from '@shared/domain/errors.js';
import { equalShares, exactShares } from './split.js';

describe('equalShares', () => {
  it('splits evenly and gives the leftover cents to the first people', () => {
    expect(equalShares(1000, ['a', 'b', 'c'])).toEqual([
      { userId: 'a', cents: 334 },
      { userId: 'b', cents: 333 },
      { userId: 'c', cents: 333 },
    ]);
  });

  it('always adds up to the expense', () => {
    const shares = equalShares(10_001, ['a', 'b', 'c', 'd', 'e', 'f', 'g']);

    expect(shares.reduce((sum, share) => sum + share.cents, 0)).toBe(10_001);
  });

  it('counts someone listed twice only once', () => {
    expect(equalShares(100, ['a', 'a'])).toEqual([{ userId: 'a', cents: 100 }]);
  });

  it('needs at least one person', () => {
    expect(() => equalShares(100, [])).toThrow(InvalidInputError);
  });
});

describe('exactShares', () => {
  it('accepts shares that add up to the expense, including a zero', () => {
    const shares = [
      { userId: 'a', cents: 700 },
      { userId: 'b', cents: 300 },
      { userId: 'c', cents: 0 },
    ];

    expect(exactShares(1000, shares)).toBe(shares);
  });

  it('refuses shares that do not add up', () => {
    expect(() =>
      exactShares(1000, [
        { userId: 'a', cents: 500 },
        { userId: 'b', cents: 400 },
      ]),
    ).toThrow('shares add up to 9.00 but the expense is 10.00');
  });

  it('refuses the same person twice, or nobody', () => {
    expect(() =>
      exactShares(1000, [
        { userId: 'a', cents: 500 },
        { userId: 'a', cents: 500 },
      ]),
    ).toThrow(InvalidInputError);
    expect(() => exactShares(0, [])).toThrow(InvalidInputError);
  });
});
