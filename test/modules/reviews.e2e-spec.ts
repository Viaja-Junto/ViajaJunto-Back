import { randomUUID } from 'node:crypto';
import { expectPage } from '../support/expect-page.js';
import { startApp, type TestApp } from '../support/test-app.js';
import type { Account } from '../support/test-data.js';

describe('Reviews (e2e)', () => {
  let t: TestApp;
  let creator: Account;
  let ana: Account;
  let bia: Account;
  let caio: Account;
  let touristSpotId: string;

  beforeAll(async () => {
    t = await startApp();
    [creator, ana, bia, caio] = await Promise.all([
      t.data.user(),
      t.data.user(),
      t.data.user(),
      t.data.user(),
    ]);
    touristSpotId = (await t.data.touristSpot(creator)).id;
  });

  afterAll(() => t.close());

  const review = (user: Account, body: object = {}) =>
    t.as(user).post('/reviews', { touristSpotId, rating: 5, ...body });

  describe('writing', () => {
    it('takes the author from the token and stores rating, comment and visit day', async () => {
      const { body } = await review(ana, {
        rating: 4,
        comment: 'Pôr do sol imperdível',
        visitedAt: '2026-10-12',
      }).expect(201);

      expect(body).toMatchObject({
        userId: ana.id,
        touristSpotId,
        rating: 4,
        comment: 'Pôr do sol imperdível',
        visitedAt: '2026-10-12',
      });
    });

    it('does not accept an author in the payload', async () => {
      await review(bia, { userId: ana.id }).expect(422);
    });

    it('answers 409 for a second review of the same spot by the same user', async () => {
      await review(ana).expect(409);
    });

    it('answers 404 for a spot that does not exist', async () => {
      await review(caio, { touristSpotId: randomUUID() }).expect(404);
    });

    it('answers 403 when the creator reviews their own spot', async () => {
      await review(creator).expect(403);
    });

    it('requires a token', async () => {
      await t.anonymous
        .post('/reviews', { touristSpotId, rating: 5 })
        .expect(401);
    });

    it('lists every violated rule in the 422', async () => {
      const { body } = await review(caio, {
        rating: 0,
        comment: 'x'.repeat(2001),
      }).expect(422);

      expect(body.message).toHaveLength(2);
    });

    it.each([
      ['a fractional rating', { rating: 3.5 }],
      ['no rating', { rating: undefined }],
      ['a visit in the future', { visitedAt: '2099-01-01' }],
      ['a visit on a day that does not exist', { visitedAt: '2026-02-30' }],
    ])('rejects %s with 422', async (_name, overrides) => {
      await review(caio, overrides).expect(422);
    });
  });

  describe('reading (public)', () => {
    let target: string;
    const authors: Account[] = [];

    beforeAll(async () => {
      target = (await t.data.touristSpot(creator)).id;
      for (let i = 1; i <= 3; i++) {
        const author = await t.data.user();
        authors.push(author);
        await t.prisma.review.create({
          data: {
            userId: author.id,
            touristSpotId: target,
            rating: i + 2,
            createdAt: new Date(Date.UTC(2026, 0, i)),
          },
        });
      }
    });

    const ratings = (body: { data: { rating: number }[] }) =>
      body.data.map((r) => r.rating);

    it('lists the reviews of a spot newest first, without a token', async () => {
      const { body } = await t.anonymous
        .get(`/reviews?touristSpotId=${target}`)
        .expect(200);

      expect(ratings(body)).toEqual([5, 4, 3]);
      expectPage(body, { page: 1, limit: 20, total: 3 });
    });

    it('paginates in the same order', async () => {
      const { body } = await t.anonymous
        .get(`/reviews?touristSpotId=${target}&limit=2&page=2`)
        .expect(200);

      expect(ratings(body)).toEqual([3]);
      expectPage(body, { page: 2, limit: 2, total: 3 });
    });

    it('filters by author and by minimum rating', async () => {
      const byAuthor = await t.anonymous
        .get(`/reviews?userId=${authors[0].id}`)
        .expect(200);
      const best = await t.anonymous
        .get(`/reviews?touristSpotId=${target}&minRating=4`)
        .expect(200);

      expect(ratings(byAuthor.body)).toEqual([3]);
      expect(ratings(best.body)).toEqual([5, 4]);
    });

    it('reads one review, and answers 404 / 400 for an unknown or malformed id', async () => {
      const row = await t.prisma.review.findFirstOrThrow({
        where: { touristSpotId: target },
      });

      await t.anonymous.get(`/reviews/${row.id}`).expect(200);
      await t.anonymous.get(`/reviews/${randomUUID()}`).expect(404);
      await t.anonymous.get('/reviews/not-a-uuid').expect(400);
    });
  });

  describe('changing and removing', () => {
    let id: string;

    beforeAll(async () => {
      id = (await review(bia, { rating: 3 }).expect(201)).body.id;
    });

    it('lets only the author change it, and only rating, comment and visit day', async () => {
      const { body } = await t
        .as(bia)
        .patch(`/reviews/${id}`, { rating: 5, comment: 'Mudei de ideia' })
        .expect(200);

      expect(body).toMatchObject({
        rating: 5,
        comment: 'Mudei de ideia',
        userId: bia.id,
      });
      await t.as(caio).patch(`/reviews/${id}`, { rating: 1 }).expect(403);
      await t
        .as(bia)
        .patch(`/reviews/${id}`, { touristSpotId: randomUUID() })
        .expect(422);
      await t
        .as(bia)
        .patch(`/reviews/${id}`, { visitedAt: '2099-01-01' })
        .expect(422);
      await t.anonymous.patch(`/reviews/${id}`, { rating: 1 }).expect(401);
    });

    it('lets only the author delete it', async () => {
      await t.as(caio).delete(`/reviews/${id}`).expect(403);
      await t.as(bia).delete(`/reviews/${id}`).expect(204);

      await t.anonymous.get(`/reviews/${id}`).expect(404);
    });

    it('answers 404 when changing or deleting an unknown review', async () => {
      await t
        .as(bia)
        .patch(`/reviews/${randomUUID()}`, { rating: 1 })
        .expect(404);
      await t.as(bia).delete(`/reviews/${randomUUID()}`).expect(404);
    });

    it('goes away with its spot', async () => {
      const spot = await t.data.touristSpot(creator);
      const written = await review(caio, { touristSpotId: spot.id }).expect(
        201,
      );

      const admin = await t.data.user('ADMIN');
      await t.as(admin).delete(`/tourist-spots/${spot.id}`).expect(204);

      await t.anonymous.get(`/reviews/${written.body.id}`).expect(404);
    });
  });
});
