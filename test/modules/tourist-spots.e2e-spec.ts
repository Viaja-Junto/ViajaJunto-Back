import { randomUUID } from 'node:crypto';
import { expectPage } from '../support/expect-page.js';
import { startApp, type TestApp } from '../support/test-app.js';
import type { Account } from '../support/test-data.js';

describe('Tourist spots (e2e)', () => {
  let t: TestApp;
  let ana: Account;
  let bia: Account;
  let admin: Account;

  beforeAll(async () => {
    t = await startApp();
    [ana, bia, admin] = await Promise.all([
      t.data.user(),
      t.data.user(),
      t.data.user('ADMIN'),
    ]);
  });

  afterAll(() => t.close());

  const payload = (overrides: object = {}) => ({
    name: t.data.next('Usina'),
    city: 'Porto Alegre',
    state: 'RS',
    country: 'Brasil',
    countryCode: 'br',
    category: 'HISTORICAL',
    latitude: -30.034647,
    longitude: -51.241455,
    ...overrides,
  });

  describe('suggesting', () => {
    it('queues a user’s suggestion, hidden from the public until approved', async () => {
      const body = payload();

      const created = await t.as(ana).post('/tourist-spots', body).expect(201);

      expect(created.body).toMatchObject({
        name: body.name,
        countryCode: 'BR',
        category: 'HISTORICAL',
        status: 'PENDING',
        createdBy: ana.id,
        averageRating: null,
        reviewCount: 0,
      });
      await t.anonymous.get(`/tourist-spots/${created.body.id}`).expect(404);
    });

    it('publishes an administrator’s spot at once', async () => {
      const created = await t
        .as(admin)
        .post('/tourist-spots', payload())
        .expect(201);

      expect(created.body.status).toBe('APPROVED');
      await t.anonymous.get(`/tourist-spots/${created.body.id}`).expect(200);
    });

    it('links the spot to a published destination only', async () => {
      const city = await t.data.destination(admin);
      const pending = await t.data.destination(ana, { status: 'PENDING' });

      const linked = await t
        .as(ana)
        .post('/tourist-spots', payload({ destinationId: city.id }))
        .expect(201);
      expect(linked.body.destinationId).toBe(city.id);
      await t
        .as(ana)
        .post('/tourist-spots', payload({ destinationId: pending.id }))
        .expect(404);
    });

    it('answers 409 for a second spot with the same name in the same city', async () => {
      const body = payload();
      await t.as(ana).post('/tourist-spots', body).expect(201);

      await t.as(bia).post('/tourist-spots', body).expect(409);
    });

    it('requires a token', async () => {
      await t.anonymous.post('/tourist-spots', payload()).expect(401);
    });

    it.each([
      ['a rating', { averageRating: 5 }],
      ['a status', { status: 'APPROVED' }],
      ['a creator', { createdBy: randomUUID() }],
      ['a latitude out of range', { latitude: 120 }],
      ['no city', { city: undefined }],
      ['an unknown category', { category: 'CASINO' }],
    ])('rejects %s in the payload with 422', async (_name, overrides) => {
      await t.as(ana).post('/tourist-spots', payload(overrides)).expect(422);
    });
  });

  describe('browsing (public)', () => {
    const city = `Browse-${randomUUID().slice(0, 8)}`;

    beforeAll(async () => {
      await t.data.touristSpot(ana, {
        name: 'Parque Farroupilha',
        city,
        category: 'PARK',
        averageRating: 4.5,
        reviewCount: 2,
        createdAt: new Date(Date.UTC(2026, 0, 1)),
      });
      await t.data.touristSpot(ana, {
        name: 'Museu Iberê Camargo',
        city,
        category: 'MUSEUM',
        averageRating: 5,
        reviewCount: 1,
        createdAt: new Date(Date.UTC(2026, 0, 2)),
      });
      await t.data.touristSpot(bia, {
        name: 'Parque Marinha',
        city,
        category: 'PARK',
        createdAt: new Date(Date.UTC(2026, 0, 3)),
      });
    });

    const names = (body: { data: { name: string }[] }) =>
      body.data.map((spot) => spot.name);

    it('lists the newest first, without a token', async () => {
      const { body } = await t.anonymous
        .get(`/tourist-spots?city=${city}`)
        .expect(200);

      expect(names(body)).toEqual([
        'Parque Marinha',
        'Museu Iberê Camargo',
        'Parque Farroupilha',
      ]);
      expectPage(body, { page: 1, limit: 20, total: 3 });
    });

    it('sorts by rating with the unrated last, and by name', async () => {
      const byRating = await t.anonymous
        .get(`/tourist-spots?city=${city}&sort=rating`)
        .expect(200);
      const byName = await t.anonymous
        .get(`/tourist-spots?city=${city}&sort=name`)
        .expect(200);

      expect(names(byRating.body)).toEqual([
        'Museu Iberê Camargo',
        'Parque Farroupilha',
        'Parque Marinha',
      ]);
      expect(names(byName.body)).toEqual([
        'Museu Iberê Camargo',
        'Parque Farroupilha',
        'Parque Marinha',
      ]);
    });

    it('combines the filters', async () => {
      const { body } = await t.anonymous
        .get(
          `/tourist-spots?city=${city.toUpperCase()}&q=parque&category=PARK&minRating=4`,
        )
        .expect(200);

      expect(names(body)).toEqual(['Parque Farroupilha']);
    });

    it('paginates in the same order', async () => {
      const { body } = await t.anonymous
        .get(`/tourist-spots?city=${city}&limit=2&page=2`)
        .expect(200);

      expect(names(body)).toEqual(['Parque Farroupilha']);
      expectPage(body, { page: 2, limit: 2, total: 3 });
    });

    it('rejects invalid filters with 422', async () => {
      await t.anonymous.get('/tourist-spots?sort=random').expect(422);
      await t.anonymous.get('/tourist-spots?minRating=9').expect(422);
      await t.anonymous.get('/tourist-spots?limit=1000').expect(422);
    });

    it('lists only rated spots on the top list, best first', async () => {
      const { body } = await t.anonymous
        .get('/tourist-spots/top?limit=20')
        .expect(200);
      const ours = body
        .filter((spot: { city: string }) => spot.city === city)
        .map((spot: { name: string }) => spot.name);

      expect(ours).toEqual(['Museu Iberê Camargo', 'Parque Farroupilha']);
    });

    it('reads one spot, and answers 404 / 400 for an unknown or malformed id', async () => {
      const spot = await t.data.touristSpot(ana);

      await t.anonymous.get(`/tourist-spots/${spot.id}`).expect(200);
      await t.anonymous.get(`/tourist-spots/${randomUUID()}`).expect(404);
      await t.anonymous.get('/tourist-spots/not-a-uuid').expect(400);
    });
  });

  describe('changing and removing', () => {
    it('lets the author change a suggestion, and nobody else', async () => {
      const spot = await t.data.touristSpot(ana, { status: 'PENDING' });

      const { body } = await t
        .as(ana)
        .patch(`/tourist-spots/${spot.id}`, {
          description: 'Vista para o Guaíba',
          category: 'NATURE',
        })
        .expect(200);

      expect(body).toMatchObject({
        description: 'Vista para o Guaíba',
        category: 'NATURE',
        status: 'PENDING',
      });
      await t
        .as(bia)
        .patch(`/tourist-spots/${spot.id}`, { name: 'Outro' })
        .expect(403);
      await t
        .as(ana)
        .patch(`/tourist-spots/${spot.id}`, { reviewCount: 10 })
        .expect(422);
      await t.anonymous
        .patch(`/tourist-spots/${spot.id}`, { name: 'Outro' })
        .expect(401);
    });

    it('locks an approved spot for its author, but not for an administrator', async () => {
      const spot = await t.data.touristSpot(ana);

      await t
        .as(ana)
        .patch(`/tourist-spots/${spot.id}`, { name: 'Outro' })
        .expect(403);
      await t.as(ana).delete(`/tourist-spots/${spot.id}`).expect(403);

      const { body } = await t
        .as(admin)
        .patch(`/tourist-spots/${spot.id}`, { description: 'Revisado' })
        .expect(200);
      expect(body).toMatchObject({
        description: 'Revisado',
        status: 'APPROVED',
      });
    });

    it('answers 409 when a rename collides with another spot of the city', async () => {
      const taken = await t.data.touristSpot(ana);
      const spot = await t.data.touristSpot(ana, { status: 'PENDING' });

      await t
        .as(ana)
        .patch(`/tourist-spots/${spot.id}`, { name: taken.name })
        .expect(409);
    });

    it('lets the author withdraw a suggestion and an administrator delete any spot', async () => {
      const suggestion = await t.data.touristSpot(ana, { status: 'PENDING' });
      const published = await t.data.touristSpot(ana);

      await t.as(bia).delete(`/tourist-spots/${suggestion.id}`).expect(403);
      await t.as(ana).delete(`/tourist-spots/${suggestion.id}`).expect(204);
      await t.as(admin).delete(`/tourist-spots/${published.id}`).expect(204);

      await t.anonymous.get(`/tourist-spots/${published.id}`).expect(404);
    });

    it('answers 404 when changing or deleting an unknown spot', async () => {
      await t
        .as(ana)
        .patch(`/tourist-spots/${randomUUID()}`, { name: 'Nada' })
        .expect(404);
      await t.as(ana).delete(`/tourist-spots/${randomUUID()}`).expect(404);
    });
  });
});
