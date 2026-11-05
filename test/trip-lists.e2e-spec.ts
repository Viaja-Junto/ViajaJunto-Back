import { randomUUID } from 'node:crypto';
import { startApp, type TestApp } from './support/test-app.js';
import type { Account } from './support/test-data.js';

describe('Dashboard and scoped lists (e2e)', () => {
  let t: TestApp;
  let run: string;

  let owner: Account;
  let editor: Account;
  let viewer: Account;
  let stranger: Account;
  let tripId: string;
  let otherTripId: string;
  let activityId: string;
  const destinationIds: string[] = [];

  beforeAll(async () => {
    t = await startApp();
    run = t.data.tag;
    [owner, editor, viewer, stranger] = await Promise.all([
      t.data.user(),
      t.data.user(),
      t.data.user(),
      t.data.user(),
    ]);

    // Created one after the other so "newest first" is deterministic.
    await t.data.trip(owner, {
      name: `Older ${run}`,
      status: 'COMPLETED',
      createdAt: new Date(Date.now() - 60_000),
    });
    tripId = (
      await t.data.trip(owner, { name: `Newer ${run}`, status: 'PLANNING' })
    ).id;
    otherTripId = (await t.data.trip(stranger, { name: `Foreign ${run}` })).id;

    await t.prisma.tripMember.createMany({
      data: [
        { tripId, userId: editor.id, permission: 'EDITOR' },
        { tripId, userId: viewer.id, permission: 'VIEWER' },
        { tripId: otherTripId, userId: owner.id, permission: 'VIEWER' },
      ],
    });

    const catalogId = (await t.data.destination(stranger)).id;
    // Inserted out of itinerary order on purpose.
    for (const order of [2, 0, 1]) {
      const destination = await t.prisma.tripDestination.create({
        data: { tripId, destinationId: catalogId, order },
      });
      destinationIds.push(destination.id);
    }
    await t.prisma.tripDestination.create({
      data: { tripId: otherTripId, destinationId: catalogId, order: 0 },
    });

    activityId = (await t.data.touristSpot(stranger)).id;
    await t.prisma.tripActivity.createMany({
      data: [
        { tripDestinationId: destinationIds[0], touristSpotId: activityId },
        {
          tripDestinationId: destinationIds[1],
          touristSpotId: activityId,
          dateTime: new Date('2026-07-02T10:00:00Z'),
        },
      ],
    });
    await t.prisma.review.createMany({
      data: [
        {
          userId: owner.id,
          touristSpotId: activityId,
          rating: 4,
          createdAt: new Date('2026-01-01T00:00:00Z'),
        },
        {
          userId: editor.id,
          touristSpotId: activityId,
          rating: 5,
          createdAt: new Date('2026-02-01T00:00:00Z'),
        },
      ],
    });
  });

  afterAll(() => t.close());

  describe('GET /trips (dashboard)', () => {
    it('lists the caller’s own and joined trips, newest first, with their role', async () => {
      const { body } = await t.as(owner).get('/trips').expect(200);

      expect(body.data.map((t: { name: string }) => t.name)).toEqual([
        `Foreign ${run}`,
        `Newer ${run}`,
        `Older ${run}`,
      ]);
      const roles = Object.fromEntries(
        body.data.map((t: { name: string; role: string }) => [t.name, t.role]),
      );
      expect(roles).toEqual({
        [`Foreign ${run}`]: 'VIEWER',
        [`Newer ${run}`]: 'OWNER',
        [`Older ${run}`]: 'OWNER',
      });
    });

    it('reports the permission an invited member holds', async () => {
      const { body } = await t.as(editor).get('/trips').expect(200);

      expect(body.data).toHaveLength(1);
      expect(body.data[0]).toMatchObject({ id: tripId, role: 'EDITOR' });
    });

    it('filters by planning stage', async () => {
      const { body } = await t
        .as(owner)
        .get('/trips?status=COMPLETED')
        .expect(200);

      expect(body.data.map((t: { name: string }) => t.name)).toEqual([
        `Older ${run}`,
      ]);
      expect(body.meta.total).toBe(1);
    });

    it('rejects an unknown status with 422', async () => {
      await t.as(owner).get('/trips?status=NOPE').expect(422);
    });

    it('returns nothing to someone with no trips', async () => {
      const lone = await t.data.user();
      const { body } = await t.as(lone).get('/trips').expect(200);

      expect(body.data).toEqual([]);
    });

    it('includes the role on a single trip too', async () => {
      const { body } = await t.as(viewer).get(`/trips/${tripId}`).expect(200);

      expect(body.role).toBe('VIEWER');
    });
  });

  describe('lists scoped to a parent', () => {
    it('lists the destinations of a trip in itinerary order', async () => {
      const { body } = await t
        .as(editor)
        .get(`/trip-destinations?tripId=${tripId}`)
        .expect(200);

      expect(body.data.map((d: { order: number }) => d.order)).toEqual([
        0, 1, 2,
      ]);
      expect(body.meta.total).toBe(3);
    });

    it('answers 404 for the destinations of a trip the caller cannot see', async () => {
      await t
        .as(stranger)
        .get(`/trip-destinations?tripId=${tripId}`)
        .expect(404);
    });

    it('lists the members of a trip', async () => {
      const { body } = await t
        .as(viewer)
        .get(`/trip-members?tripId=${tripId}`)
        .expect(200);

      expect(body.meta.total).toBe(2);
      await t.as(stranger).get(`/trip-members?tripId=${tripId}`).expect(404);
    });

    it('lists the planned activities of a stop in chronological order', async () => {
      const { body } = await t
        .as(owner)
        .get(`/trip-activities?tripDestinationId=${destinationIds[1]}`)
        .expect(200);

      expect(body.meta.total).toBe(1);
      await t
        .as(stranger)
        .get(`/trip-activities?tripDestinationId=${destinationIds[1]}`)
        .expect(404);
    });

    it('rejects a malformed parent id with 422', async () => {
      await t.as(owner).get('/trip-destinations?tripId=nope').expect(422);
    });

    it('lists the reviews of a tourist spot, newest first, without a token', async () => {
      const { body } = await t.anonymous
        .get(`/reviews?touristSpotId=${activityId}`)
        .expect(200);

      expect(body.data.map((r: { rating: number }) => r.rating)).toEqual([
        5, 4,
      ]);
    });
  });

  describe('PUT /trips/:id/destinations/order', () => {
    const put = (user: Account, id: string, ids: string[]) =>
      t
        .as(user)
        .put(`/trips/${id}/destinations/order`, { destinationIds: ids });

    it('rewrites the order as 0..n-1 and returns the new itinerary', async () => {
      const current = await t
        .as(owner)
        .get(`/trip-destinations?tripId=${tripId}`);
      const reversed: string[] = current.body.data
        .map((d: { id: string }) => d.id)
        .reverse();

      const { body } = await put(editor, tripId, reversed).expect(200);

      expect(body.map((d: { id: string }) => d.id)).toEqual(reversed);
      expect(body.map((d: { order: number }) => d.order)).toEqual([0, 1, 2]);
    });

    it('rejects ids that are not exactly the trip’s destinations', async () => {
      await put(owner, tripId, [destinationIds[0]]).expect(422);
      await put(owner, tripId, [
        destinationIds[0],
        destinationIds[0],
        destinationIds[1],
      ]).expect(422);
      await put(owner, tripId, [...destinationIds, randomUUID()]).expect(422);
    });

    it('forbids a viewer', async () => {
      await put(viewer, tripId, destinationIds).expect(403);
    });

    it('answers 404 for a trip the caller cannot see', async () => {
      await put(stranger, tripId, destinationIds).expect(404);
    });

    it('does not let someone reorder another trip’s destinations', async () => {
      await put(owner, otherTripId, destinationIds).expect(403);
    });
  });
});
