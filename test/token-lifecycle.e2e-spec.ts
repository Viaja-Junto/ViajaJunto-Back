import { startApp, tokenFor, type TestApp } from './support/test-app.js';
import { TEST_PASSWORD, type Account } from './support/test-data.js';

describe('Token lifecycle (e2e)', () => {
  let t: TestApp;
  let ana: Account;
  let bia: Account;

  beforeAll(async () => {
    t = await startApp();
    [ana, bia] = await Promise.all([t.data.user(), t.data.user()]);
  });

  afterAll(() => t.close());

  const me = (token: string) =>
    t.anonymous.get('/auth/me').set('Authorization', `Bearer ${token}`);

  it('ends every session of the caller and only theirs', async () => {
    const phone = tokenFor(ana);
    const laptop = tokenFor(ana);
    const biaToken = tokenFor(bia);

    await me(phone).expect(200);
    await t.anonymous
      .post('/auth/logout')
      .set('Authorization', `Bearer ${phone}`)
      .expect(204);

    await me(phone).expect(401);
    await me(laptop).expect(401);
    await me(biaToken).expect(200);
  });

  it('lets the user sign in again after signing out', async () => {
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const { body } = await t.anonymous
      .post('/auth/login', { email: ana.email, password: TEST_PASSWORD })
      .expect(200);

    const { body: profile } = await me(body.accessToken).expect(200);
    expect(profile).toMatchObject({ id: ana.id, role: 'USER' });
  });

  it('requires a token to sign out', async () => {
    await t.anonymous.post('/auth/logout').expect(401);
  });
});
