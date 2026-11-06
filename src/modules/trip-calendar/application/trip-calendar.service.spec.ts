import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '@shared/domain/errors.js';
import type { TripAccessService } from '@modules/trip-access/application/trip-access.service.js';
import type { ItineraryRepository } from '../domain/itinerary.js';
import { TripCalendarService } from './trip-calendar.service.js';

const user = { id: 'ana', email: 'ana@example.com' };
const itinerary = {
  id: 'trip-1',
  name: 'Férias no Sul!',
  description: null,
  currency: 'BRL',
  startDate: new Date('2026-12-01T00:00:00.000Z'),
  endDate: null,
  stops: [],
};

describe('TripCalendarService', () => {
  let itineraries: { findByTrip: ReturnType<typeof vi.fn> };
  let access: { assertCanRead: ReturnType<typeof vi.fn> };
  let service: TripCalendarService;

  beforeEach(() => {
    itineraries = { findByTrip: vi.fn().mockResolvedValue(itinerary) };
    access = { assertCanRead: vi.fn().mockResolvedValue('VIEWER') };
    service = new TripCalendarService(
      itineraries as unknown as ItineraryRepository,
      access as unknown as TripAccessService,
    );
  });

  it('lets any member export the trip as a file named after it', async () => {
    const file = await service.export('trip-1', user);

    expect(access.assertCanRead).toHaveBeenCalledWith('trip-1', 'ana');
    expect(file.filename).toBe('ferias-no-sul.ics');
    expect(file.content).toContain('BEGIN:VCALENDAR');
  });

  it('falls back to a generic name when the trip name has no usable letters', async () => {
    itineraries.findByTrip.mockResolvedValue({ ...itinerary, name: '!!!' });

    await expect(service.export('trip-1', user)).resolves.toMatchObject({
      filename: 'viagem.ics',
    });
  });

  it('never reads the itinerary of a trip the caller cannot see', async () => {
    access.assertCanRead.mockRejectedValue(new NotFoundError('Not found'));

    await expect(service.export('trip-1', user)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(itineraries.findByTrip).not.toHaveBeenCalled();
  });

  it('answers 404 when the trip disappeared in between', async () => {
    itineraries.findByTrip.mockResolvedValue(null);

    await expect(service.export('trip-1', user)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
