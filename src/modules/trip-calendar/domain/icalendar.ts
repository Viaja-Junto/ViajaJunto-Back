import type {
  Itinerary,
  ItineraryActivity,
  ItineraryStop,
} from './itinerary.js';

const DEFAULT_DURATION_MINUTES = 60;
const MAX_LINE_OCTETS = 75;
const DAY_MS = 24 * 60 * 60 * 1000;

interface CalendarEvent {
  uid: string;
  summary: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
}

export function buildCalendar(itinerary: Itinerary, now: Date): string {
  const events = [
    tripEvent(itinerary),
    ...itinerary.stops.flatMap((stop) => [
      stopEvent(stop),
      ...stop.activities.map((activity) =>
        activityEvent(activity, itinerary.currency),
      ),
    ]),
  ].filter((event): event is CalendarEvent => event !== null);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ViajaJunto//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(itinerary.name)}`,
    ...events.flatMap((event) => eventLines(event, now)),
    'END:VCALENDAR',
  ];

  return lines.map(fold).join('\r\n') + '\r\n';
}

export function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export function fold(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  let size = 0;

  for (const char of line) {
    const octets = encoder.encode(char).length;
    const limit = parts.length === 0 ? MAX_LINE_OCTETS : MAX_LINE_OCTETS - 1;

    if (size + octets > limit) {
      parts.push(current);
      current = '';
      size = 0;
    }

    current += char;
    size += octets;
  }

  parts.push(current);

  return parts.join('\r\n ');
}

function tripEvent(itinerary: Itinerary): CalendarEvent | null {
  if (!itinerary.startDate) return null;

  return {
    uid: `trip-${itinerary.id}@viajajunto`,
    summary: itinerary.name,
    start: `VALUE=DATE:${formatDate(itinerary.startDate)}`,
    end: `VALUE=DATE:${formatDate(dayAfter(itinerary.endDate ?? itinerary.startDate))}`,
    description: itinerary.description ?? undefined,
  };
}

function stopEvent(stop: ItineraryStop): CalendarEvent | null {
  if (!stop.arrival) return null;

  return {
    uid: `stop-${stop.id}@viajajunto`,
    summary: `${stop.destinationName}, ${stop.country}`,
    start: `VALUE=DATE:${formatDate(stop.arrival)}`,
    end: `VALUE=DATE:${formatDate(dayAfter(stop.departure ?? stop.arrival))}`,
    location: `${stop.destinationName}, ${stop.country}`,
    description: stop.description ?? undefined,
  };
}

function activityEvent(
  activity: ItineraryActivity,
  currency: string,
): CalendarEvent | null {
  if (!activity.dateTime) return null;

  const minutes = activity.durationMinutes ?? DEFAULT_DURATION_MINUTES;
  const details = [`Status: ${activity.status}`];
  if (activity.expectedCost !== null) {
    details.push(
      `Expected cost: ${activity.expectedCost.toFixed(2)} ${currency}`,
    );
  }

  return {
    uid: `activity-${activity.id}@viajajunto`,
    summary: activity.spotName,
    start: `:${formatDateTime(activity.dateTime)}`,
    end: `:${formatDateTime(new Date(activity.dateTime.getTime() + minutes * 60_000))}`,
    location: [activity.address, activity.city].filter(Boolean).join(', '),
    description: details.join('\n'),
  };
}

function eventLines(event: CalendarEvent, now: Date): string[] {
  return [
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${formatDateTime(now)}`,
    `DTSTART${prefix(event.start)}`,
    `DTEND${prefix(event.end)}`,
    `SUMMARY:${escapeText(event.summary)}`,
    ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
    ...(event.description
      ? [`DESCRIPTION:${escapeText(event.description)}`]
      : []),
    'END:VEVENT',
  ];
}

function prefix(value: string): string {
  return value.startsWith(':') ? value : `;${value}`;
}

function dayAfter(date: Date): Date {
  return new Date(date.getTime() + DAY_MS);
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

function formatDateTime(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}
