import { describe, expect, it } from 'vitest';
import { roundRating } from './spot-rating.js';

describe('roundRating', () => {
  it.each([
    [4, 4],
    [4.666666, 4.67],
    [4.333333, 4.33],
    [1.005, 1.01],
    [2.5, 2.5],
  ])('rounds %d to %d', (average, rounded) => {
    expect(roundRating(average)).toBe(rounded);
  });
});
