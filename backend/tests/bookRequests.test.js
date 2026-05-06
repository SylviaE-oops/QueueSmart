const request = require('supertest');
const { app, pool } = require('../server');

const ts = Date.now();

let user1Id;
let user2Id;

beforeAll(async () => {
  const u1 = await request(app).post('/api/auth/register').send({
    fullName: 'Book Request User One',
    email: `br_u1_${ts}@test.com`,
    password: 'password123',
  });
  user1Id = u1.body.user.id;

  const u2 = await request(app).post('/api/auth/register').send({
    fullName: 'Book Request User Two',
    email: `br_u2_${ts}@test.com`,
    password: 'password123',
  });
  user2Id = u2.body.user.id;
});

afterAll(async () => {
  if (pool) await pool.end();
});

describe('Book Requests', () => {
  test('POST /api/book-requests – creates request with all fields', async () => {
    const res = await request(app).post('/api/book-requests').send({
      userId: user1Id,
      bookTitle: 'The Great Test',
      author: 'Test Author',
      isbn: '978-0000000001',
      notes: 'Test note',
    });
    expect(res.statusCode).toBe(201);
  });

  test('POST /api/book-requests – creates second request (user2)', async () => {
    const res = await request(app).post('/api/book-requests').send({
      userId: user2Id,
      bookTitle: 'Another Test Book',
    });
    expect(res.statusCode).toBe(201);
  });

  test('POST /api/book-requests – rejects missing userId', async () => {
    const res = await request(app).post('/api/book-requests').send({ bookTitle: 'No User' });
    expect(res.statusCode).toBe(400);
  });

  test('POST /api/book-requests – rejects missing bookTitle', async () => {
    const res = await request(app).post('/api/book-requests').send({ userId: user1Id });
    expect(res.statusCode).toBe(400);
  });

  test('POST /api/book-requests – rejects non-existent user', async () => {
    const res = await request(app).post('/api/book-requests').send({
      userId: 999999,
      bookTitle: 'Ghost Book',
    });
    expect([400, 404, 500]).toContain(res.statusCode);
  });

  test('GET /api/admin/book-requests – admin list', async () => {
    const res = await request(app).get('/api/admin/book-requests');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.requests)).toBe(true);
  });

  test('GET /api/book-requests/user/:userId – user list', async () => {
    const res = await request(app).get(`/api/book-requests/user/${user1Id}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.requests)).toBe(true);
  });

  test('PATCH /api/admin/book-requests/:id/status – updates status', async () => {
    const list = await request(app).get('/api/admin/book-requests');
    const firstId = list.body.requests[0]?.id;
    if (!firstId) return;
    const res = await request(app)
      .patch(`/api/admin/book-requests/${firstId}/status`)
      .send({ status: 'preparing' });
    expect(res.statusCode).toBe(200);
  });
});
