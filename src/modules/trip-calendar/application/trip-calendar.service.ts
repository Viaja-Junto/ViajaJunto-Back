import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '@shared/domain/authenticated-user.js';
import { NotFoundError } from '@shared/domain/errors.js';
import { TripAccessService } from '@modules/trip-access/application/trip-access.service.js';
import { buildCalendar } from '../domain/icalendar.js';
import { ItineraryRepository } from '../domain/itinerary.js';

export interface CalendarFile {
  filename: string;
  content: string;
}

@Injectable()
export class TripCalendarService {
  constructor(
    private readonly itineraries: ItineraryRepository,
    private readonly access: TripAccessService,
  ) {}

  async export(
    tripId: string,
    user: AuthenticatedUser,
    now: Date = new Date(),
  ): Promise<CalendarFile> {
    await this.access.assertCanRead(tripId, user.id);
    const itinerary = await this.itineraries.findByTrip(tripId);

    if (!itinerary) {
      throw new NotFoundError(`Trip with id "${tripId}" not found`);
    }

    return {
      filename: `${slug(itinerary.name)}.ics`,
      content: buildCalendar(itinerary, now),
    };
  }
}

function slug(name: string): string {
  const ascii = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return ascii || 'viagem';
}
