import { describe, expect, it } from 'vitest';
import {
  formatVisitDate,
  isFutureVisit,
  parseVisitDate,
} from './visit-date.js';

describe('parseVisitDate', () => {
  it('reads a calendar day as midnight UTC', () => {
    expect(parseVisitDate('2026-10-12')).toEqual(
      new Date('2026-10-12T00:00:00.000Z'),
    );
  });

  it.each([
    '2026-02-30',
    '2026-13-01',
    '12/10/2026',
    '2026-10-12T10:00:00Z',
    '',
  ])('refuses %s', (day) => {
    expect(parseVisitDate(day)).toBeNull();
  });

  it('accepts the 29th of February of a leap year', () => {
    expect(parseVisitDate('2028-02-29')).not.toBeNull();
  });
});

describe('isFutureVisit', () => {
  const now = new Date('2026-11-05T14:00:00.000Z');

  it.each([
    ['a past visit', '2026-10-12', false],
    ['a visit today', '2026-11-05', false],
    ['tomorrow, still today somewhere ahead of UTC', '2026-11-06', false],
    ['two days ahead', '2026-11-07', true],
    ['next year', '2027-01-01', true],
  ])('%s → %s', (_name, day, expected) => {
    expect(isFutureVisit(parseVisitDate(day)!, now)).toBe(expected);
  });
});

describe('formatVisitDate', () => {
  it('writes the day back as YYYY-MM-DD', () => {
    expect(formatVisitDate(new Date('2026-10-12T00:00:00.000Z'))).toBe(
      '2026-10-12',
    );
  });
});
