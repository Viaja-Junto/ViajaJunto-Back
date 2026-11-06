import { randomUUID } from 'node:crypto';
import { startApp, type TestApp } from '../support/test-app.js';
import type { Account } from '../support/test-data.js';

describe('Users (e2e)', () => {
  let t: TestApp;
  let ana: Account;
  let bia: Account;

  beforeAll(async () => {
    t = await startApp();
    [ana, bia] = await Promise.all([t.data.user(), t.data.user()]);
  });

  afterAll(() => t.close());

  it('requires a token for every route', async () => {
    await t.anonymous.get('/users').expect(401);
    await t.anonymous.get(`/users/${ana.id}`).expect(401);
  });

  it('finds people by name or email, without exposing passwords', async () => {
    const { body } = await t
      .as(ana)
      .get(`/users?q=${bia.name.toUpperCase()}`)
      .expect(200);

    expect(body.data).toEqual([
      expect.objectContaining({ id: bia.id, email: bia.email, role: 'USER' }),
    ]);
    expect(body.data[0]).not.toHaveProperty('passwordHash');
  });

  it('reads one account, and answers 404 / 400 for an unknown or malformed id', async () => {
    await t.as(ana).get(`/users/${bia.id}`).expect(200);
    await t.as(ana).get(`/users/${randomUUID()}`).expect(404);
    await t.as(ana).get('/users/not-a-uuid').expect(400);
  });

  describe('changing an account', () => {
    it('lets you change your own name and email', async () => {
      const email = `${t.data.next('renamed')}@example.com`;

      const { body } = await t
        .as(ana)
        .patch(`/users/${ana.id}`, {
          name: 'Ana Renomeada',
          email: email.toUpperCase(),
        })
        .expect(200);

      expect(body).toMatchObject({ name: 'Ana Renomeada', email });
      ana = { ...ana, email };
    });

    it('forbids changing someone else’s account', async () => {
      await t
        .as(ana)
        .patch(`/users/${bia.id}`, { name: 'Invasão' })
        .expect(403);
    });

    it('answers 409 for an email another account already uses', async () => {
      await t
        .as(ana)
        .patch(`/users/${ana.id}`, { email: bia.email })
        .expect(409);
    });

    it('never lets the role change through the API', async () => {
      await t.as(ana).patch(`/users/${ana.id}`, { role: 'ADMIN' }).expect(422);
    });
  });

  describe('deleting an account', () => {
    it('removes the account and recalculates the ratings its reviews fed', async () => {
      const owner = await t.data.user();
      const leaving = await t.data.user();
      const spot = await t.data.touristSpot(owner);
      await t
        .as(leaving)
        .post('/reviews', { touristSpotId: spot.id, rating: 5 })
        .expect(201);

      await t.as(ana).delete(`/users/${leaving.id}`).expect(403);
      await t.as(leaving).delete(`/users/${leaving.id}`).expect(204);

      await t.as(owner).get(`/users/${leaving.id}`).expect(404);
      const { body } = await t.anonymous
        .get(`/tourist-spots/${spot.id}`)
        .expect(200);
      expect(body).toMatchObject({ averageRating: null, reviewCount: 0 });
    });
  });
});
