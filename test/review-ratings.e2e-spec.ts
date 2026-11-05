import { startApp, type TestApp } from './support/test-app.js';
import type { Account } from './support/test-data.js';

describe('Tourist spot ratings (e2e)', () => {
  let t: TestApp;
  let creator: Account;

  beforeAll(async () => {
    t = await startApp();
    creator = await t.data.user();
  });

  afterAll(() => t.close());

  const ratingOf = async (spotId: string) => {
    const { body } = await t.anonymous
      .get(`/tourist-spots/${spotId}`)
      .expect(200);

    return { averageRating: body.averageRating, reviewCount: body.reviewCount };
  };

  it('follows every review written, changed and removed', async () => {
    const spot = await t.data.touristSpot(creator);
    const [ana, bia, caio] = await Promise.all([
      t.data.user(),
      t.data.user(),
      t.data.user(),
    ]);

    expect(await ratingOf(spot.id)).toEqual({
      averageRating: null,
      reviewCount: 0,
    });

    const write = (user: Account, rating: number) =>
      t
        .as(user)
        .post('/reviews', { touristSpotId: spot.id, rating })
        .expect(201);

    await write(ana, 5);
    await write(bia, 4);
    const third = await write(caio, 5);
    expect(await ratingOf(spot.id)).toEqual({
      averageRating: 4.67,
      reviewCount: 3,
    });

    await t
      .as(caio)
      .patch(`/reviews/${third.body.id}`, { rating: 1 })
      .expect(200);
    expect(await ratingOf(spot.id)).toEqual({
      averageRating: 3.33,
      reviewCount: 3,
    });

    await t.as(caio).delete(`/reviews/${third.body.id}`).expect(204);
    expect(await ratingOf(spot.id)).toEqual({
      averageRating: 4.5,
      reviewCount: 2,
    });
  });

  it('stays consistent when many reviews arrive at the same time', async () => {
    const spot = await t.data.touristSpot(creator);
    const reviewers = await Promise.all(
      Array.from({ length: 8 }, () => t.data.user()),
    );

    await Promise.all(
      reviewers.map((user, index) =>
        t
          .as(user)
          .post('/reviews', { touristSpotId: spot.id, rating: (index % 5) + 1 })
          .expect(201),
      ),
    );

    // Ratings 1,2,3,4,5,1,2,3 → 21 / 8.
    expect(await ratingOf(spot.id)).toEqual({
      averageRating: 2.63,
      reviewCount: 8,
    });
  });

  it('feeds the top list, best rated first', async () => {
    const [ana, bia] = await Promise.all([t.data.user(), t.data.user()]);
    const good = await t.data.touristSpot(creator);
    const great = await t.data.touristSpot(creator);

    await t
      .as(ana)
      .post('/reviews', { touristSpotId: good.id, rating: 4 })
      .expect(201);
    await t
      .as(ana)
      .post('/reviews', { touristSpotId: great.id, rating: 5 })
      .expect(201);
    await t
      .as(bia)
      .post('/reviews', { touristSpotId: great.id, rating: 5 })
      .expect(201);

    const { body } = await t.anonymous
      .get('/tourist-spots/top?limit=20')
      .expect(200);
    const ids = body.map((spot: { id: string }) => spot.id);

    // Other suites run in parallel and rate spots too, so `good` may fall off the list.
    const greatAt = ids.indexOf(great.id);
    const goodAt = ids.indexOf(good.id);
    expect(greatAt).toBeGreaterThanOrEqual(0);
    expect(goodAt === -1 || greatAt < goodAt).toBe(true);
  });
});
