import { startApp, type TestApp } from './support/test-app.js';
import type { Account } from './support/test-data.js';

describe('Itinerary rules (e2e)', () => {
  let t: TestApp;
  let owner: Account;
  let editor: Account;
  let tripId: string;

  beforeAll(async () => {
    t = await startApp();
    [owner, editor] = await Promise.all([t.data.user(), t.data.user()]);
    tripId = (await t.data.trip(owner)).id;
    await t.data.member(tripId, editor, 'EDITOR');
  });

  afterAll(() => t.close());

  it('only puts published destinations and tourist spots on a trip', async () => {
    const suggested = await t.data.destination(owner, { status: 'PENDING' });
    const published = await t.data.destination(owner);
    const pendingSpot = await t.data.touristSpot(owner, { status: 'PENDING' });

    await t
      .as(editor)
      .post('/trip-destinations', { tripId, destinationId: suggested.id })
      .expect(404);
    const stop = await t
      .as(editor)
      .post('/trip-destinations', { tripId, destinationId: published.id })
      .expect(201);
    await t
      .as(editor)
      .post('/trip-activities', {
        tripDestinationId: stop.body.id,
        touristSpotId: pendingSpot.id,
      })
      .expect(404);
  });

  it('tells the rest of the trip when a stop is added, but not who added it', async () => {
    const destination = await t.data.destination(owner);
    const stop = await t
      .as(editor)
      .post('/trip-destinations', { tripId, destinationId: destination.id })
      .expect(201);

    const added = async (user: Account) =>
      (await t.as(user).get('/notifications').expect(200)).body.data.filter(
        (n: { type: string; payload: { subjectId?: string } }) =>
          n.type === 'DESTINATION_ADDED' &&
          n.payload.subjectId === stop.body.id,
      );
    for (let i = 0; i < 50 && (await added(owner)).length === 0; i++) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    expect(await added(owner)).toHaveLength(1);
    expect(await added(editor)).toHaveLength(0);
  });

  it('keeps a destination or tourist spot that a trip uses from being deleted', async () => {
    const admin = await t.data.user('ADMIN');
    const destination = await t.data.destination(owner);
    const spot = await t.data.touristSpot(owner);
    const stop = await t.prisma.tripDestination.create({
      data: { tripId, destinationId: destination.id },
    });
    await t.prisma.tripActivity.create({
      data: { tripDestinationId: stop.id, touristSpotId: spot.id },
    });

    await t.as(admin).delete(`/destinations/${destination.id}`).expect(409);
    await t.as(admin).delete(`/tourist-spots/${spot.id}`).expect(409);
  });
});
