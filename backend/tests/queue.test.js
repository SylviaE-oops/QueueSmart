const request = require('supertest');
const { app, pool } = require('../server');

const ts = Date.now();

let locationId;
let serviceId;
let service2Id;
let user1Id, user2Id, user3Id, user4Id;
let notificationId;

beforeAll(async () => {
  // Create location
  const loc = await request(app).post('/api/locations').send({ name: `Queue Test Branch ${ts}` });
  locationId = loc.body.locationId;

  // Create open service
  const svc = await request(app).post('/api/services').send({
    name: `Queue Test Service A ${ts}`,
    description: 'Open service for queue tests',
    isOpen: true,
    locationId,
  });
  serviceId = svc.body.serviceId;

  // Create a second service (open) for closed-service test
  const svc2 = await request(app).post('/api/services').send({
    name: `Queue Test Service B ${ts}`,
    description: 'Service for closed-service test',
    isOpen: true,
    locationId,
  });
  service2Id = svc2.body.serviceId;

  // Register 4 users
  const u1 = await request(app).post('/api/auth/register').send({
    fullName: 'Queue User One',
    email: `qu1_${ts}@test.com`,
    password: 'password123',
  });
  user1Id = u1.body.user.id;

  const u2 = await request(app).post('/api/auth/register').send({
    fullName: 'Queue User Two',
    email: `qu2_${ts}@test.com`,
    password: 'password123',
  });
  user2Id = u2.body.user.id;

  const u3 = await request(app).post('/api/auth/register').send({
    fullName: 'Queue User Three',
    email: `qu3_${ts}@test.com`,
    password: 'password123',
  });
  user3Id = u3.body.user.id;

  const u4 = await request(app).post('/api/auth/register').send({
    fullName: 'Queue User Four',
    email: `qu4_${ts}@test.com`,
    password: 'password123',
  });
  user4Id = u4.body.user.id;
});

afterAll(async () => {
  if (pool) await pool.end();
});

// ─── Joining ──────────────────────────────────────────────────────────────────
describe('Queue – joining and reading', () => {
  test('POST /api/queues/join – user1 joins service1 at position 1', async () => {
    const res = await request(app).post('/api/queues/join').send({ userId: user1Id, serviceId });
    expect(res.statusCode).toBe(201);
    expect(res.body.entry).toBeDefined();
    expect(res.body.entry.position).toBe(1);
  });

  test('POST /api/queues/join – user2 joins service1 at position 2', async () => {
    const res = await request(app).post('/api/queues/join').send({ userId: user2Id, serviceId });
    expect(res.statusCode).toBe(201);
    expect(res.body.entry.position).toBe(2);
  });

  test('POST /api/queues/join – user3 joins service1 at position 3', async () => {
    const res = await request(app).post('/api/queues/join').send({ userId: user3Id, serviceId });
    expect(res.statusCode).toBe(201);
    expect(res.body.entry.position).toBe(3);
  });

  test('POST /api/queues/join – rejects duplicate (user1 already in queue)', async () => {
    const res = await request(app).post('/api/queues/join').send({ userId: user1Id, serviceId });
    expect(res.statusCode).toBe(409);
  });

  test('POST /api/queues/join – rejects missing userId/serviceId', async () => {
    const res = await request(app).post('/api/queues/join').send({});
    expect(res.statusCode).toBe(400);
  });

  test('POST /api/queues/join – rejects non-existent service', async () => {
    const res = await request(app).post('/api/queues/join').send({ userId: user4Id, serviceId: 999999 });
    expect([400, 404]).toContain(res.statusCode);
  });

  test('POST /api/queues/join – rejects closed service', async () => {
    await request(app).put(`/api/services/${service2Id}`).send({
      name: `Queue Test Service B ${ts} (Closed)`,
      description: 'Closed',
      isOpen: false,
    });
    const res = await request(app).post('/api/queues/join').send({ userId: user4Id, serviceId: service2Id });
    expect(res.statusCode).toBe(400);
  });

  test('POST /api/queues/join – with explicit locationId (covers join location path)', async () => {
    await request(app).put(`/api/services/${service2Id}`).send({
      name: `Queue Test Service B ${ts} (Open)`,
      description: 'Reopened',
      isOpen: true,
    });
    const res = await request(app).post('/api/queues/join').send({
      userId: user4Id,
      serviceId: service2Id,
      locationId,
    });
    expect(res.statusCode).toBe(201);
  });

  test('GET /api/queues/service/:serviceId – returns queue', async () => {
    const res = await request(app).get(`/api/queues/service/${serviceId}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.queue)).toBe(true);
    expect(res.body.queue.length).toBeGreaterThanOrEqual(1);
  });

  test('GET /api/queues/service/:serviceId – id=0 returns empty queue (no validation)', async () => {
    const res = await request(app).get('/api/queues/service/0');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.queue)).toBe(true);
  });

  test('GET /api/queues/user/:userId/current – returns entry', async () => {
    const res = await request(app).get(`/api/queues/user/${user2Id}/current`);
    expect(res.statusCode).toBe(200);
  });
});

// ─── Admin operations ─────────────────────────────────────────────────────────
describe('Queue – admin operations', () => {
  test('POST /api/admin/queue/reorder – swaps user1 and user2', async () => {
    const qRes = await request(app).get(`/api/queues/service/${serviceId}`);
    expect(qRes.body.queue.length).toBeGreaterThanOrEqual(2);
    const entries = qRes.body.queue;
    const entry2Id = entries[1].id;
    const entry1Id = entries[0].id;

    const res = await request(app).post('/api/admin/queue/reorder').send({
      serviceId,
      orderedEntryIds: [entry2Id, entry1Id],
    });
    expect(res.statusCode).toBe(200);
  });

  test('POST /api/admin/queue/reorder – rejects missing ids', async () => {
    const res = await request(app).post('/api/admin/queue/reorder').send({ serviceId: 0 });
    expect(res.statusCode).toBe(400);
  });

  test('POST /api/admin/queue/serve-next – serves position-1 user (triggers addHistory + notifications)', async () => {
    const res = await request(app).post('/api/admin/queue/serve-next').send({ serviceId });
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('POST /api/admin/queue/serve-next – second call serves another user', async () => {
    const res = await request(app).post('/api/admin/queue/serve-next').send({ serviceId });
    expect(res.statusCode).toBe(200);
  });

  test('POST /api/admin/queue/serve-next – third call (one user remains)', async () => {
    const res = await request(app).post('/api/admin/queue/serve-next').send({ serviceId });
    expect(res.statusCode).toBe(200);
  });

  test('POST /api/admin/queue/serve-next – empty queue returns 404', async () => {
    const res = await request(app).post('/api/admin/queue/serve-next').send({ serviceId });
    expect(res.statusCode).toBe(404);
  });

  test('POST /api/admin/queue/serve-next – rejects id=0', async () => {
    const res = await request(app).post('/api/admin/queue/serve-next').send({ serviceId: 0 });
    expect(res.statusCode).toBe(400);
  });

  test('POST /api/admin/queue/serve-next – rejects missing serviceId', async () => {
    const res = await request(app).post('/api/admin/queue/serve-next').send({});
    expect(res.statusCode).toBe(400);
  });

  test('POST /api/admin/queue/remove-entry – removes a fresh entry', async () => {
    const join = await request(app).post('/api/queues/join').send({ userId: user1Id, serviceId });
    expect(join.statusCode).toBe(201);
    const entryId = join.body.entry.id;

    const res = await request(app).post('/api/admin/queue/remove-entry').send({ entryId });
    expect(res.statusCode).toBe(200);
  });

  test('POST /api/admin/queue/remove-entry – entry not found', async () => {
    const res = await request(app).post('/api/admin/queue/remove-entry').send({ entryId: 999999 });
    expect(res.statusCode).toBe(404);
  });

  test('POST /api/admin/queue/remove-entry – id=0 returns 404 (no id validation)', async () => {
    const res = await request(app).post('/api/admin/queue/remove-entry').send({ entryId: 0 });
    expect(res.statusCode).toBe(404);
  });
});

// ─── User leave ───────────────────────────────────────────────────────────────
describe('Queue – user leave', () => {
  test('POST /api/queues/leave – user2 leaves mid-queue (resequences)', async () => {
    const j2 = await request(app).post('/api/queues/join').send({ userId: user2Id, serviceId });
    expect(j2.statusCode).toBe(201);
    const j3 = await request(app).post('/api/queues/join').send({ userId: user3Id, serviceId });
    expect(j3.statusCode).toBe(201);

    const res = await request(app).post('/api/queues/leave').send({ userId: user2Id });
    expect(res.statusCode).toBe(200);
  });

  test('POST /api/queues/leave – rejects id=0', async () => {
    const res = await request(app).post('/api/queues/leave').send({ userId: 0 });
    expect(res.statusCode).toBe(400);
  });

  test('POST /api/queues/leave – no active entry returns 404', async () => {
    const res = await request(app).post('/api/queues/leave').send({ userId: user2Id });
    expect(res.statusCode).toBe(404);
  });

  test('POST /api/queues/leave – user3 also leaves (clean up)', async () => {
    const res = await request(app).post('/api/queues/leave').send({ userId: user3Id });
    expect(res.statusCode).toBe(200);
  });
});

// ─── Notifications ────────────────────────────────────────────────────────────
describe('Notifications', () => {
  test('GET /api/notifications/:userId – returns notifications (populated by queue ops)', async () => {
    const res = await request(app).get(`/api/notifications/${user1Id}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.notifications)).toBe(true);
    if (res.body.notifications.length > 0) {
      notificationId = res.body.notifications[0].id;
    }
  });

  test('GET /api/notifications/:userId – id=0 returns empty list (no validation)', async () => {
    const res = await request(app).get('/api/notifications/0');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.notifications)).toBe(true);
  });

  test('POST /api/notifications/:id/read – marks notification as read', async () => {
    if (!notificationId) {
      const j = await request(app).post('/api/queues/join').send({ userId: user1Id, serviceId });
      await request(app).post('/api/queues/leave').send({ userId: user1Id });
      const nr = await request(app).get(`/api/notifications/${user1Id}`);
      notificationId = nr.body.notifications[0]?.id;
    }
    if (!notificationId) return;

    const res = await request(app).post(`/api/notifications/${notificationId}/read`);
    expect(res.statusCode).toBe(200);
  });
});

// ─── History ──────────────────────────────────────────────────────────────────
describe('History', () => {
  test('GET /api/history/:userId – returns history', async () => {
    const res = await request(app).get(`/api/history/${user1Id}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.history)).toBe(true);
  });

  test('GET /api/history/:userId – id=0 returns empty list (no validation)', async () => {
    const res = await request(app).get('/api/history/0');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.history)).toBe(true);
  });
});
