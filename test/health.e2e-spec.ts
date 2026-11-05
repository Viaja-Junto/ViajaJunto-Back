import { startApp, type TestApp } from './support/test-app.js';

describe('Health (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await startApp();
  });

  afterAll(() => t.close());

  it('answers 200 when the database is up, without a token', async () => {
    const { body } = await t.anonymous.get('/health').expect(200);

    expect(body).toMatchObject({
      status: 'ok',
      details: { database: { status: 'up' } },
    });
  });

  it('answers 404 under an unknown route', async () => {
    await t.anonymous.get('/does-not-exist').expect(404);
  });
});
