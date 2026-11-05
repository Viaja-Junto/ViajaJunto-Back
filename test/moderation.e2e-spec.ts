import { startApp, type TestApp } from './support/test-app.js';
import type { Account } from './support/test-data.js';

/** A suggestion's whole life: queued, rejected, fixed, approved, and the author told each time. */
describe.each([
  ['tourist spots', '/tourist-spots', 'TOURIST_SPOT'],
  ['destinations', '/destinations', 'DESTINATION'],
] as const)('Moderation of %s (e2e)', (_name, route, catalog) => {
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

  const suggestion = () =>
    route === '/tourist-spots'
      ? {
          name: t.data.next('Mirante'),
          city: 'Porto Alegre',
          country: 'Brasil',
        }
      : { name: t.data.next('Cidade'), country: `País-${t.data.tag}` };

  const notificationsOf = async (user: Account) =>
    (await t.as(user).get('/notifications').expect(200)).body.data;

  const waitForNotifications = async (user: Account, count: number) => {
    for (let i = 0; i < 50; i++) {
      const data = await notificationsOf(user);
      if (data.length >= count) return data;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    return notificationsOf(user);
  };

  it('takes a suggestion from the queue to the public catalog', async () => {
    const { body: created } = await t
      .as(ana)
      .post(route, suggestion())
      .expect(201);
    const id = created.id;

    const mine = await t.as(ana).get(`${route}/mine`).expect(200);
    expect(mine.body.data.map((e: { id: string }) => e.id)).toContain(id);

    const queue = await t.as(admin).get(`${route}/moderation`).expect(200);
    expect(queue.body.data.map((e: { id: string }) => e.id)).toContain(id);

    const rejected = await t
      .as(admin)
      .patch(`${route}/${id}/reject`, { reason: 'Falta a descrição' })
      .expect(200);
    expect(rejected.body).toMatchObject({
      status: 'REJECTED',
      rejectionReason: 'Falta a descrição',
    });
    await t
      .as(admin)
      .patch(`${route}/${id}/reject`, { reason: 'De novo' })
      .expect(409);

    const [rejection] = await waitForNotifications(ana, 1);
    expect(rejection).toMatchObject({
      type: 'SUBMISSION_REJECTED',
      tripId: null,
      actorId: admin.id,
      payload: { catalog, subjectId: id, reason: 'Falta a descrição' },
    });

    const fixed = await t
      .as(ana)
      .patch(`${route}/${id}`, { description: 'Agora com descrição' })
      .expect(200);
    expect(fixed.body).toMatchObject({
      status: 'PENDING',
      rejectionReason: null,
    });

    await t.anonymous.get(`${route}/${id}`).expect(404);
    const approved = await t
      .as(admin)
      .patch(`${route}/${id}/approve`)
      .expect(200);
    expect(approved.body).toMatchObject({
      status: 'APPROVED',
      reviewedAt: expect.any(String),
    });
    await t.anonymous.get(`${route}/${id}`).expect(200);

    const notifications = await waitForNotifications(ana, 2);
    expect(notifications.map((n: { type: string }) => n.type)).toEqual([
      'SUBMISSION_APPROVED',
      'SUBMISSION_REJECTED',
    ]);
    await t
      .as(ana)
      .patch(`${route}/${id}`, { description: 'Mudança' })
      .expect(403);
  });

  it('keeps the queue and the decisions to administrators', async () => {
    const { body } = await t.as(ana).post(route, suggestion()).expect(201);

    await t.as(bia).get(`${route}/moderation`).expect(403);
    await t.as(ana).patch(`${route}/${body.id}/approve`).expect(403);
    await t
      .as(bia)
      .patch(`${route}/${body.id}/reject`, { reason: 'Não gostei' })
      .expect(403);
    await t.anonymous.patch(`${route}/${body.id}/approve`).expect(401);
  });

  it('requires a reason to reject', async () => {
    const { body } = await t.as(ana).post(route, suggestion()).expect(201);

    await t.as(admin).patch(`${route}/${body.id}/reject`, {}).expect(422);
    await t
      .as(admin)
      .patch(`${route}/${body.id}/reject`, { reason: 'ok' })
      .expect(422);
  });

  it('only lists the caller’s own suggestions, filtered by status', async () => {
    await t.as(bia).post(route, suggestion()).expect(201);

    const { body } = await t
      .as(ana)
      .get(`${route}/mine?status=PENDING`)
      .expect(200);

    expect(
      body.data.every(
        (e: { createdBy: string; status: string }) =>
          e.createdBy === ana.id && e.status === 'PENDING',
      ),
    ).toBe(true);
  });
});
