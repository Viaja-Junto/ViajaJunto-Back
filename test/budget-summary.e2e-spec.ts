import { startApp, type TestApp } from './support/test-app.js';
import type { Account } from './support/test-data.js';

type Category = 'MUSEUM' | 'PARK' | 'BEACH';

describe('Budget summary (e2e)', () => {
  let t: TestApp;
  let owner: Account;
  let viewer: Account;
  let stranger: Account;
  let budgetedTripId: string;
  let bareTripId: string;

  const summary = (tripId: string, user: Account) =>
    t.as(user).get(`/trips/${tripId}/budget/summary`);

  const plan = async (
    stopId: string,
    category: Category,
    expectedCost: number | null,
  ) => {
    const spot = await t.data.touristSpot(owner, { category });
    await t.prisma.tripActivity.create({
      data: { tripDestinationId: stopId, touristSpotId: spot.id, expectedCost },
    });
  };

  beforeAll(async () => {
    t = await startApp();
    [owner, viewer, stranger] = await Promise.all([
      t.data.user(),
      t.data.user(),
      t.data.user(),
    ]);

    const trip = await t.prisma.trip.update({
      where: { id: (await t.data.trip(owner)).id },
      data: { currency: 'EUR' },
    });
    budgetedTripId = trip.id;
    await t.prisma.budget.create({
      data: { tripId: trip.id, totalValue: 500 },
    });
    await t.data.member(trip.id, viewer, 'VIEWER');
    const stop = await t.prisma.tripDestination.create({
      data: {
        tripId: trip.id,
        destinationId: (await t.data.destination(owner)).id,
      },
    });
    await plan(stop.id, 'MUSEUM', 120.1);
    await plan(stop.id, 'MUSEUM', 80.2);
    await plan(stop.id, 'BEACH', 400);
    await plan(stop.id, 'PARK', null);

    bareTripId = (await t.data.trip(owner)).id;
  });

  afterAll(() => t.close());

  it('derives what is planned from the activities and flags an overrun', async () => {
    const { body } = await summary(budgetedTripId, owner).expect(200);

    expect(body).toMatchObject({
      currency: 'EUR',
      totalValue: 500,
      planned: 600.3,
      remaining: -100.3,
      overBudget: true,
      activityCount: 4,
      unpricedActivities: 1,
    });
  });

  it('breaks consumption down by tourist spot category', async () => {
    const { body } = await summary(budgetedTripId, owner).expect(200);

    expect(body.byCategory).toEqual([
      { category: 'NATURE', planned: 0, count: 0 },
      { category: 'BEACH', planned: 400, count: 1 },
      { category: 'PARK', planned: 0, count: 1 },
      { category: 'MUSEUM', planned: 200.3, count: 2 },
      { category: 'MONUMENT', planned: 0, count: 0 },
      { category: 'HISTORICAL', planned: 0, count: 0 },
      { category: 'ENTERTAINMENT', planned: 0, count: 0 },
      { category: 'OTHER', planned: 0, count: 0 },
    ]);
  });

  it('works for a trip with no budget and no activities', async () => {
    const { body } = await summary(bareTripId, owner).expect(200);

    expect(body).toMatchObject({
      currency: 'BRL',
      totalValue: null,
      planned: 0,
      remaining: null,
      overBudget: false,
      activityCount: 0,
    });
  });

  it('is readable by a viewer', async () => {
    await summary(budgetedTripId, viewer).expect(200);
  });

  it('answers 404 to someone with no access to the trip', async () => {
    await summary(budgetedTripId, stranger).expect(404);
  });

  it('answers 401 without a token', async () => {
    await t.anonymous
      .get(`/trips/${budgetedTripId}/budget/summary`)
      .expect(401);
  });

  it('never accepts a typed-in planned amount', async () => {
    await t
      .as(owner)
      .post('/budgets', {
        tripId: bareTripId,
        totalValue: 100,
        plannedActivities: 50,
      })
      .expect(422);
  });
});
