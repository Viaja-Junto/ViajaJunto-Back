import { JwtService } from '@nestjs/jwt';
import { startApp, type TestApp } from '../support/test-app.js';
import { TEST_PASSWORD, type Account } from '../support/test-data.js';

describe('Auth (e2e)', () => {
  let t: TestApp;
  let ana: Account;

  beforeAll(async () => {
    t = await startApp();
    ana = await t.data.user();
  });

  afterAll(() => t.close());

  const register = (body: object) => t.anonymous.post('/auth/register', body);

  describe('register', () => {
    it('creates the account, signs it in and keeps only a hash of the password', async () => {
      const email = `${t.data.next('new')}@example.com`;

      const { body } = await register({
        name: 'Bia Lima',
        email: email.toUpperCase(),
        password: 'viaja-junto-2026',
      }).expect(201);

      expect(body).toMatchObject({ tokenType: 'Bearer', expiresIn: 3600 });
      const row = await t.prisma.user.findUniqueOrThrow({ where: { email } });
      t.data.track(row.id);
      expect(row.passwordHash).toMatch(/^scrypt:/);

      const me = await t.anonymous
        .get('/auth/me')
        .set('Authorization', `Bearer ${body.accessToken}`)
        .expect(200);
      expect(me.body).toEqual({
        id: row.id,
        name: 'Bia Lima',
        email,
        role: 'USER',
        createdAt: row.createdAt.toISOString(),
      });
    });

    it('answers 409 for an email that is already taken, whatever its case', async () => {
      await register({
        name: 'Outra Ana',
        email: ana.email.toUpperCase(),
        password: 'viaja-junto-2026',
      }).expect(409);
    });

    it.each([
      ['a short password', { password: 'short' }],
      ['an invalid email', { email: 'not-an-email' }],
      ['a missing name', { name: undefined }],
      ['an unknown property', { role: 'ADMIN' }],
    ])('rejects %s with 422', async (_name, overrides) => {
      await register({
        name: 'Caio',
        email: `${t.data.next('invalid')}@example.com`,
        password: 'viaja-junto-2026',
        ...overrides,
      }).expect(422);
    });
  });

  describe('login', () => {
    it('issues a token that opens the protected routes', async () => {
      const { body } = await t.anonymous
        .post('/auth/login', { email: ana.email, password: TEST_PASSWORD })
        .expect(200);

      const me = await t.anonymous
        .get('/auth/me')
        .set('Authorization', `Bearer ${body.accessToken}`)
        .expect(200);
      expect(me.body.id).toBe(ana.id);
    });

    it('answers the same 401 for a wrong password and an unknown email', async () => {
      const wrongPassword = await t.anonymous
        .post('/auth/login', { email: ana.email, password: 'wrong-password' })
        .expect(401);
      const unknownEmail = await t.anonymous
        .post('/auth/login', {
          email: 'nobody@example.com',
          password: TEST_PASSWORD,
        })
        .expect(401);

      expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
    });
  });

  describe('protected routes', () => {
    it('answers 401 without a token', async () => {
      await t.anonymous.get('/auth/me').expect(401);
    });

    it('answers 401 for a token signed with another secret', async () => {
      const forged = new JwtService({
        secret: 'another-secret-that-is-at-least-32-chars',
      }).sign({ sub: ana.id, email: ana.email });

      await t.anonymous
        .get('/auth/me')
        .set('Authorization', `Bearer ${forged}`)
        .expect(401);
    });

    it('answers 401 once the account behind the token is gone', async () => {
      const gone = await t.data.user();
      const caller = t.as(gone);
      await t.prisma.user.delete({ where: { id: gone.id } });

      await caller.get('/auth/me').expect(401);
    });
  });
});
