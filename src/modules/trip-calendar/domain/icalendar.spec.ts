import { describe, expect, it } from 'vitest';
import { buildCalendar, escapeText, fold } from './icalendar.js';
import type { Itinerary } from './itinerary.js';

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const now = new Date('2026-11-05T12:30:00.000Z');

const itinerary: Itinerary = {
  id: 'trip-1',
  name: 'Férias no Sul',
  description: 'Serra e capital',
  currency: 'BRL',
  startDate: day('2026-12-01'),
  endDate: day('2026-12-10'),
  stops: [
    {
      id: 'stop-1',
      destinationName: 'Porto Alegre',
      country: 'Brasil',
      arrival: day('2026-12-01'),
      departure: day('2026-12-04'),
      description: null,
      activities: [
        {
          id: 'act-1',
          spotName: 'Usina do Gasômetro',
          address: 'Av. Pres. João Goulart, 551',
          city: 'Porto Alegre',
          dateTime: new Date('2026-12-02T18:00:00.000Z'),
          durationMinutes: 90,
          expectedCost: 25,
          status: 'CONFIRMED',
        },
        {
          id: 'act-2',
          spotName: 'Mercado Público',
          address: null,
          city: 'Porto Alegre',
          dateTime: null,
          durationMinutes: null,
          expectedCost: null,
          status: 'PENDING',
        },
      ],
    },
    {
      id: 'stop-2',
      destinationName: 'Gramado',
      country: 'Brasil',
      arrival: null,
      departure: null,
      description: null,
      activities: [],
    },
  ],
};

const unfold = (text: string) => text.replace(/\r\n /g, '');

describe('buildCalendar', () => {
  const ics = buildCalendar(itinerary, now);
  const lines = unfold(ics).split('\r\n');

  it('wraps everything in one calendar named after the trip, with CRLF line endings', () => {
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines).toContain('VERSION:2.0');
    expect(lines).toContain('X-WR-CALNAME:Férias no Sul');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n');
  });

  it('makes the trip an all-day event whose end is the day after the last day', () => {
    expect(lines).toEqual(
      expect.arrayContaining([
        'UID:trip-trip-1@viajajunto',
        'DTSTART;VALUE=DATE:20261201',
        'DTEND;VALUE=DATE:20261211',
        'SUMMARY:Férias no Sul',
        'DESCRIPTION:Serra e capital',
      ]),
    );
  });

  it('makes each dated stop an all-day event at the destination', () => {
    expect(lines).toEqual(
      expect.arrayContaining([
        'UID:stop-stop-1@viajajunto',
        'DTEND;VALUE=DATE:20261205',
        'SUMMARY:Porto Alegre\\, Brasil',
      ]),
    );
  });

  it('schedules each dated activity in UTC for its duration, with place and cost', () => {
    expect(lines).toEqual(
      expect.arrayContaining([
        'UID:activity-act-1@viajajunto',
        'DTSTART:20261202T180000Z',
        'DTEND:20261202T193000Z',
        'SUMMARY:Usina do Gasômetro',
        'LOCATION:Av. Pres. João Goulart\\, 551\\, Porto Alegre',
        'DESCRIPTION:Status: CONFIRMED\\nExpected cost: 25.00 BRL',
        'DTSTAMP:20261105T123000Z',
      ]),
    );
  });

  it('leaves out what has no date', () => {
    expect(ics).not.toContain('act-2');
    expect(ics).not.toContain('stop-2');
    expect(lines.filter((line) => line === 'BEGIN:VEVENT')).toHaveLength(3);
  });

  it('assumes one hour for an activity without a duration and a one-day trip without an end', () => {
    const lone = buildCalendar(
      {
        ...itinerary,
        endDate: null,
        stops: [
          {
            ...itinerary.stops[0],
            departure: null,
            activities: [
              { ...itinerary.stops[0].activities[0], durationMinutes: null },
            ],
          },
        ],
      },
      now,
    );

    expect(lone).toContain('DTEND:20261202T190000Z');
    expect(lone).toContain('DTEND;VALUE=DATE:20261202');
  });

  it('skips the trip event when the trip has no start date', () => {
    const undated = buildCalendar(
      { ...itinerary, startDate: null, stops: [] },
      now,
    );

    expect(undated).not.toContain('BEGIN:VEVENT');
  });
});

describe('escapeText', () => {
  it('escapes the characters iCalendar reserves', () => {
    expect(escapeText('a\\b;c,d\ne')).toBe('a\\\\b\\;c\\,d\\ne');
  });
});

describe('fold', () => {
  it('keeps short lines as they are', () => {
    expect(fold('SUMMARY:Paris')).toBe('SUMMARY:Paris');
  });

  it('breaks long lines at 75 octets without splitting a character', () => {
    const line = `SUMMARY:${'ã'.repeat(60)}`;
    const folded = fold(line).split('\r\n');
    const encoder = new TextEncoder();

    expect(folded.length).toBeGreaterThan(1);
    folded.forEach((part) =>
      expect(encoder.encode(part).length).toBeLessThanOrEqual(75),
    );
    expect(folded.slice(1).every((part) => part.startsWith(' '))).toBe(true);
    expect(folded.map((part, i) => (i ? part.slice(1) : part)).join('')).toBe(
      line,
    );
  });
});
