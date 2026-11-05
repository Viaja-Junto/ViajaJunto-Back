import { randomUUID } from 'node:crypto';
import { expectPage } from '../support/expect-page.js';
import { startApp, type TestApp } from '../support/test-app.js';
import type { Account } from '../support/test-data.js';

describe('Destinations (e2e)', () => {
  let t: TestApp;
  let ana: Account;
  let admin: Account;

  beforeAll(async () => {
    t = await startApp();
    [ana, admin] = await Promise.all([t.data.user(), t.data.user('ADMIN')]);
  });

  afterAll(() => t.close());

  describe('browsing (public)', () => {
    const country = `Pais-${randomUUID().slice(0, 8)}`;

    beforeAll(async () => {
      await t.data.destination(admin, {
        name: 'Gramado',
        country,
        category: 'NATURE',
        averageRating: 4.9,
        reviewCount: 3,
      });
      await t.data.destination(admin, {
        name: 'Canela',
        country,
        category: 'NATURE',
        averageRating: 4.2,
        reviewCount: 1,
      });
      await t.data.destination(admin, {
        name: 'Bento Gonçalves',
        country,
        category: 'CULTURAL',
      });
      await t.data.destination(ana, {
        name: 'Nova Petrópolis',
        country,
        status: 'PENDING',
      });
    });

    const names = (body: { data: { name: string }[] }) =>
      body.data.map((d) => d.name);

    it('lists only published destinations, alphabetically, without a token', async () => {
      const { body } = await t.anonymous
        .get(`/destinations?country=${country}`)
        .expect(200);

      expect(names(body)).toEqual(['Bento Gonçalves', 'Canela', 'Gramado']);
      expectPage(body, { page: 1, limit: 20, total: 3 });
    });

    it('filters by name and category', async () => {
      const { body } = await t.anonymous
        .get(
          `/destinations?country=${country.toUpperCase()}&q=gram&category=NATURE`,
        )
        .expect(200);

      expect(names(body)).toEqual(['Gramado']);
    });

    it('ranks the reviewed destinations, best first', async () => {
      const { body } = await t.anonymous
        .get('/destinations/top?limit=20')
        .expect(200);
      const ours = body
        .filter((d: { country: string }) => d.country === country)
        .map((d: { name: string }) => d.name);

      expect(ours).toEqual(['Gramado', 'Canela']);
    });

    it('rejects invalid filters with 422', async () => {
      await t.anonymous.get('/destinations?category=DESERT').expect(422);
      await t.anonymous.get('/destinations/top?limit=99').expect(422);
    });

    it('reads one destination, and answers 404 / 400 for an unknown or malformed id', async () => {
      const destination = await t.data.destination(admin);

      await t.anonymous.get(`/destinations/${destination.id}`).expect(200);
      await t.anonymous.get(`/destinations/${randomUUID()}`).expect(404);
      await t.anonymous.get('/destinations/not-a-uuid').expect(400);
    });
  });

  describe('suggesting and changing', () => {
    it('validates the payload and answers 409 for a duplicate in the same country', async () => {
      const body = {
        name: t.data.next('Cidade'),
        country: 'Brasil',
        countryCode: 'br',
      };

      const created = await t.as(ana).post('/destinations', body).expect(201);
      expect(created.body).toMatchObject({
        countryCode: 'BR',
        status: 'PENDING',
        createdBy: ana.id,
      });

      await t.as(admin).post('/destinations', body).expect(409);
      await t
        .as(ana)
        .post('/destinations', { ...body, name: 'X' })
        .expect(422);
      await t
        .as(ana)
        .post('/destinations', {
          ...body,
          name: t.data.next('C'),
          latitude: 91,
        })
        .expect(422);
      await t.anonymous.post('/destinations', body).expect(401);
    });

    it('keeps the tourist spots of a deleted destination, without it', async () => {
      const destination = await t.data.destination(admin);
      const spot = await t.data.touristSpot(admin, {
        destinationId: destination.id,
      });

      await t.as(admin).delete(`/destinations/${destination.id}`).expect(204);

      const { body } = await t.anonymous
        .get(`/tourist-spots/${spot.id}`)
        .expect(200);
      expect(body.destinationId).toBeNull();
    });
  });
});
