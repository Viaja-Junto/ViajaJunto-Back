import { randomUUID } from 'node:crypto';
import { startApp, type TestApp } from '../support/test-app.js';
import type { Account } from '../support/test-data.js';

describe('Notifications (e2e)', () => {
  let t: TestApp;
  let ana: Account;
  let bia: Account;

  beforeAll(async () => {
    t = await startApp();
    [ana, bia] = await Promise.all([t.data.user(), t.data.user()]);
  });

  afterAll(() => t.close());

  const notify = (user: Account, createdAt: Date, readAt: Date | null = null) =>
    t.prisma.notification.create({
      data: {
        userId: user.id,
        type: 'SUBMISSION_APPROVED',
        payload: { subjectName: 'Usina' },
        createdAt,
        readAt,
      },
    });

  it('requires a token', async () => {
    await t.anonymous.get('/notifications').expect(401);
    await t.anonymous.get('/notifications/unread-count').expect(401);
  });

  it('lists only the caller’s notifications, unread first and newest first', async () => {
    const oldUnread = await notify(ana, new Date(Date.UTC(2026, 0, 1)));
    const read = await notify(ana, new Date(Date.UTC(2026, 0, 3)), new Date());
    const newUnread = await notify(ana, new Date(Date.UTC(2026, 0, 2)));
    await notify(bia, new Date(Date.UTC(2026, 0, 4)));

    const { body } = await t.as(ana).get('/notifications').expect(200);

    expect(body.data.map((n: { id: string }) => n.id)).toEqual([
      newUnread.id,
      oldUnread.id,
      read.id,
    ]);
    expect(body.data[0]).toMatchObject({ tripId: null, read: false });
    expect(body.meta.total).toBe(3);
  });

  it('counts, marks one and marks all as read', async () => {
    const one = await notify(bia, new Date());
    await notify(bia, new Date());

    const before = await t
      .as(bia)
      .get('/notifications/unread-count')
      .expect(200);
    expect(before.body.unread).toBe(3);

    const marked = await t
      .as(bia)
      .patch(`/notifications/${one.id}/read`)
      .expect(200);
    expect(marked.body).toMatchObject({ id: one.id, read: true });
    await t.as(bia).patch(`/notifications/${one.id}/read`).expect(200);

    const all = await t.as(bia).patch('/notifications/read-all').expect(200);
    expect(all.body.updated).toBe(2);
    const after = await t
      .as(bia)
      .get('/notifications/unread-count')
      .expect(200);
    expect(after.body.unread).toBe(0);
  });

  it('answers 404 for someone else’s or an unknown notification, and 400 for a malformed id', async () => {
    const others = await notify(bia, new Date());

    await t.as(ana).patch(`/notifications/${others.id}/read`).expect(404);
    await t.as(ana).patch(`/notifications/${randomUUID()}/read`).expect(404);
    await t.as(ana).patch('/notifications/not-a-uuid/read').expect(400);
  });
});
