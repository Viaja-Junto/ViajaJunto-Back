import request from 'supertest';
import { startApp, tokenFor, type TestApp } from './support/test-app.js';
import type { Account } from './support/test-data.js';

/** The smallest valid PNG: the type is checked from the content, not the name. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

describe.each([
  ['tourist spots', '/tourist-spots'],
  ['destinations', '/destinations'],
] as const)('Photos of %s (e2e)', (_name, route) => {
  let t: TestApp;
  let ana: Account;
  let bia: Account;
  let suggestionId: string;

  beforeAll(async () => {
    t = await startApp();
    [ana, bia] = await Promise.all([t.data.user(), t.data.user()]);
    suggestionId = (
      route === '/tourist-spots'
        ? await t.data.touristSpot(ana, { status: 'PENDING' })
        : await t.data.destination(ana, { status: 'PENDING' })
    ).id;
  });

  afterAll(() => t.close());

  const upload = (user: Account, id: string) =>
    request(t.app.getHttpServer())
      .put(`/api${route}/${id}/photo`)
      .set('Authorization', `Bearer ${tokenFor(user)}`);

  it('requires a file, and a real image', async () => {
    await upload(ana, suggestionId).expect(422);
    await upload(ana, suggestionId)
      .attach('file', Buffer.from('not an image'), {
        filename: 'x.png',
        contentType: 'image/png',
      })
      .expect(422);
  });

  it('applies the edit permission: nobody but the author or an administrator', async () => {
    await upload(bia, suggestionId)
      .attach('file', PNG, { filename: 'photo.png', contentType: 'image/png' })
      .expect(403);
  });

  it('answers 503 while object storage is not configured', async () => {
    await upload(ana, suggestionId)
      .attach('file', PNG, { filename: 'photo.png', contentType: 'image/png' })
      .expect(503);
  });

  it('requires a token', async () => {
    await request(t.app.getHttpServer())
      .put(`/api${route}/${suggestionId}/photo`)
      .expect(401);
  });
});
