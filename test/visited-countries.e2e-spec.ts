import { startApp, type TestApp } from './support/test-app.js';
import type { Account } from './support/test-data.js';

describe('Visited countries (e2e)', () => {
  let t: TestApp;
  let traveller: Account;
  let guest: Account;
  let lone: Account;

  const place = async (country: string, countryCode: string | null) =>
    (
      await t.data.destination(traveller, {
        country,
        countryCode: countryCode ?? undefined,
      })
    ).id;

  const trip = async (
    status: 'PLANNING' | 'COMPLETED',
    destinations: string[],
  ) => {
    const created = await t.data.trip(traveller, { status });
    for (const destinationId of destinations) {
      await t.prisma.tripDestination.create({
        data: { tripId: created.id, destinationId },
      });
    }
    return created.id;
  };

  const visited = (user: Account) =>
    t.as(user).get('/users/me/visited-countries');

  beforeAll(async () => {
    t = await startApp();
    [traveller, guest, lone] = await Promise.all([
      t.data.user(),
      t.data.user(),
      t.data.user(),
    ]);

    const tag = t.data.tag;
    const paris = await place(`França ${tag}`, 'FR');
    const lyon = await place(`França ${tag}`, 'FR');
    const lisbon = await place(`Portugal ${tag}`, 'PT');
    const oslo = await place(`Noruega ${tag}`, 'NO');

    await trip('COMPLETED', [paris, lyon, lisbon]);
    await trip('COMPLETED', [paris]);
    // Not completed yet: Norway must not show up.
    await trip('PLANNING', [oslo]);
    // A completed trip the guest was invited to.
    const shared = await trip('COMPLETED', [lisbon]);
    await t.data.member(shared, guest, 'VIEWER');
  });

  afterAll(() => t.close());

  it('lists the distinct countries of the completed trips, with their trip count', async () => {
    const { body } = await visited(traveller).expect(200);

    expect(body).toEqual([
      { country: `França ${t.data.tag}`, countryCode: 'FR', tripCount: 2 },
      { country: `Portugal ${t.data.tag}`, countryCode: 'PT', tripCount: 2 },
    ]);
  });

  it('leaves out countries of trips that are not completed', async () => {
    const { body } = await visited(traveller).expect(200);

    expect(
      body.map((c: { countryCode: string }) => c.countryCode),
    ).not.toContain('NO');
  });

  it('includes trips the user was invited to', async () => {
    const { body } = await visited(guest).expect(200);

    expect(body).toEqual([
      { country: `Portugal ${t.data.tag}`, countryCode: 'PT', tripCount: 1 },
    ]);
  });

  it('is empty for a user without completed trips', async () => {
    await expect(visited(lone).expect(200)).resolves.toMatchObject({
      body: [],
    });
  });

  it('requires a token', async () => {
    await t.anonymous.get('/users/me/visited-countries').expect(401);
  });
});
