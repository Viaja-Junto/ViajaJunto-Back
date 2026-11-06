import { describe, expect, it, vi } from 'vitest';
import type { Response } from 'express';
import type { TripCalendarService } from '../application/trip-calendar.service.js';
import { TripCalendarController } from './trip-calendar.controller.js';

describe('TripCalendarController', () => {
  it('sends the calendar as a downloadable text/calendar file', async () => {
    const service = {
      export: vi
        .fn()
        .mockResolvedValue({ filename: 'eurotrip.ics', content: 'BEGIN' }),
    };
    const res = { setHeader: vi.fn() };
    const user = { id: 'ana', email: 'ana@example.com' };
    const controller = new TripCalendarController(
      service as unknown as TripCalendarService,
    );

    const body = await controller.calendar(
      'trip-1',
      user,
      res as unknown as Response,
    );

    expect(service.export).toHaveBeenCalledWith('trip-1', user);
    expect(body).toBe('BEGIN');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/calendar; charset=utf-8',
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="eurotrip.ics"',
    );
  });
});
