import { startApp, type TestApp } from './support/test-app.js';
import type { Account } from './support/test-data.js';

describe('Trip invite code (e2e)', () => {
  let t: TestApp;
  let owner: Account;
  let guest: Account;
  let other: Account;
  let tripId: string;
  let code: string;

  beforeAll(async () => {
    t = await startApp();
    [owner, guest, other] = await Promise.all([
      t.data.user(),
      t.data.user(),
      t.data.user(),
    ]);

    const created = await t
      .as(owner)
      .post('/trips', { name: t.data.next('Invite') })
      .expect(201);
    tripId = created.body.id;
  });

  afterAll(() => t.close());

  it('generates a code when the trip is created, and never returns it with the trip', async () => {
    const trip = await t.as(owner).get(`/trips/${tripId}`).expect(200);
    expect(trip.body).not.toHaveProperty('inviteCode');

    const response = await t
      .as(owner)
      .get(`/trips/${tripId}/invite-code`)
      .expect(200);

    expect(response.body.code).toMatch(/^[A-HJKMNP-Z2-9]{8}$/);
    code = response.body.code;
  });

  it('shows the code to the creator only', async () => {
    await t.as(other).get(`/trips/${tripId}/invite-code`).expect(404);
  });

  it('lets a user join with the code as a VIEWER', async () => {
    const response = await t
      .as(guest)
      .post('/trips/join', { code: code.toLowerCase() })
      .expect(201);

    expect(response.body).toMatchObject({ id: tripId, role: 'VIEWER' });
    const member = await t.prisma.tripMember.findFirst({
      where: { tripId, userId: guest.id },
    });
    expect(member?.permission).toBe('VIEWER');
  });

  it('then shows the trip on the guest’s dashboard but still hides the code', async () => {
    const trips = await t.as(guest).get('/trips').expect(200);
    expect(trips.body.data.map((trip: { id: string }) => trip.id)).toContain(
      tripId,
    );

    await t.as(guest).get(`/trips/${tripId}/invite-code`).expect(403);
    await t
      .as(guest)
      .post(`/trips/${tripId}/invite-code/regenerate`)
      .expect(403);
  });

  it('answers 409 when the user already joined', async () => {
    await t.as(guest).post('/trips/join', { code }).expect(409);
  });

  it('answers 409 when the creator joins their own trip', async () => {
    await t.as(owner).post('/trips/join', { code }).expect(409);
  });

  it('answers 404 for a well-formed code that belongs to no trip', async () => {
    await t.as(other).post('/trips/join', { code: 'AAAAAAAA' }).expect(404);
  });

  it('answers 422 for a malformed code', async () => {
    await t.as(other).post('/trips/join', { code: 'nope' }).expect(422);
  });

  it('regenerates the code: the old one stops working, members keep access', async () => {
    const regenerated = await t
      .as(owner)
      .post(`/trips/${tripId}/invite-code/regenerate`)
      .expect(200);

    expect(regenerated.body.code).not.toBe(code);
    await t.as(other).post('/trips/join', { code }).expect(404);
    await t
      .as(other)
      .post('/trips/join', { code: regenerated.body.code })
      .expect(201);
    await t.as(guest).get(`/trips/${tripId}`).expect(200);
  });

  it('tells the people on the trip who joined, but not the one who joined', async () => {
    const joined = async (user: Account) =>
      (await t.as(user).get('/notifications').expect(200)).body.data.filter(
        (n: { type: string; tripId: string }) =>
          n.type === 'MEMBER_JOINED' && n.tripId === tripId,
      );

    for (let i = 0; i < 50 && (await joined(owner)).length < 2; i++) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    const ownerNotifications = await joined(owner);
    expect(ownerNotifications).toHaveLength(2);
    expect(ownerNotifications[0].payload).toMatchObject({
      tripName: expect.stringContaining('Invite'),
      permission: 'VIEWER',
    });
    expect(await joined(other)).toHaveLength(0);
  });
});
