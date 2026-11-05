import { startApp, type TestApp } from './support/test-app.js';
import type { Account } from './support/test-data.js';

describe('Date rules (e2e)', () => {
  let t: TestApp;
  let user: Account;
  let catalogId: string;
  let touristSpotId: string;
  let tripId: string;
  let destinationId: string;
  const run = Date.now().toString(36);

  beforeAll(async () => {
    t = await startApp();
    user = await t.data.user();
    catalogId = (await t.data.destination(user)).id;
    touristSpotId = (await t.data.touristSpot(user)).id;
    tripId = (
      await t.data.trip(user, {
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-07-15'),
      })
    ).id;
    destinationId = (
      await t.prisma.tripDestination.create({
        data: {
          tripId,
          destinationId: catalogId,
          arrival: new Date('2026-07-02'),
          departure: new Date('2026-07-05'),
        },
      })
    ).id;
  });

  afterAll(() => t.close());

  describe('trips', () => {
    it('rejects an end date before the start date', async () => {
      const response = await t
        .as(user)
        .post('/trips', {
          name: 'Backwards',
          startDate: '2026-08-10',
          endDate: '2026-08-01',
        })
        .expect(422);

      expect(response.body.message).toEqual([
        'endDate must not be earlier than startDate',
      ]);
    });

    it('rejects an update that would invert the stored dates', async () => {
      await t
        .as(user)
        .patch(`/trips/${tripId}`, { endDate: '2026-06-01' })
        .expect(422);
    });

    it('accepts a one-day trip', async () => {
      await t
        .as(user)
        .post('/trips', {
          name: `One day ${run}`,
          startDate: '2026-08-01',
          endDate: '2026-08-01',
        })
        .expect(201);
    });
  });

  describe('destinations', () => {
    it('rejects a departure before the arrival', async () => {
      await t
        .as(user)
        .post('/trip-destinations', {
          tripId,
          destinationId: catalogId,
          arrival: '2026-07-10',
          departure: '2026-07-09',
        })
        .expect(422);
    });

    it('rejects dates outside the trip', async () => {
      const response = await t
        .as(user)
        .post('/trip-destinations', {
          tripId,
          destinationId: catalogId,
          arrival: '2026-06-20',
          departure: '2026-07-03',
        })
        .expect(422);

      expect(response.body.message).toEqual([
        'arrival must be within the trip dates (2026-07-01 to 2026-07-15)',
      ]);
    });

    it('accepts a stay inside the trip', async () => {
      await t
        .as(user)
        .post('/trip-destinations', {
          tripId,
          destinationId: catalogId,
          arrival: '2026-07-06',
          departure: '2026-07-08',
        })
        .expect(201);
    });

    it('rejects an update that moves the arrival past the stored departure', async () => {
      await t
        .as(user)
        .patch(`/trip-destinations/${destinationId}`, {
          arrival: '2026-07-09',
        })
        .expect(422);
    });
  });

  describe('activities', () => {
    const activity = (dateTime: string) => ({
      tripDestinationId: destinationId,
      touristSpotId,
      dateTime,
    });

    it('rejects an activity before the arrival', async () => {
      const response = await t
        .as(user)
        .post('/trip-activities', activity('2026-07-01T10:00:00Z'))
        .expect(422);

      expect(response.body.message).toEqual([
        'dateTime must be within the destination stay (2026-07-02 to 2026-07-05)',
      ]);
    });

    it('accepts an activity on the departure day', async () => {
      await t
        .as(user)
        .post('/trip-activities', activity('2026-07-05T21:30:00Z'))
        .expect(201);
    });

    it('rejects an update that moves the activity out of the stay', async () => {
      const created = await t
        .as(user)
        .post('/trip-activities', activity('2026-07-03T10:00:00Z'))
        .expect(201);

      await t
        .as(user)
        .patch(`/trip-activities/${created.body.id}`, {
          dateTime: '2026-07-20T10:00:00Z',
        })
        .expect(422);
    });
  });
});
