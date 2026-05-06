const request = require('supertest');
const { app, pool } = require('../server');

const ts = Date.now();

afterAll(async () => {
  if (pool) await pool.end();
});

describe('Auth – register', () => {
  test('POST /api/auth/register – creates user1', async () => {
    const res = await request(app).post('/api/auth/register').send({
      fullName: 'Test User One',
      email: `auth_u1_${ts}@test.com`,
      password: 'password123',
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.user.id).toBeGreaterThan(0);
  });

  test('POST /api/auth/register – creates user2', async () => {
    const res = await request(app).post('/api/auth/register').send({
      fullName: 'Test User Two',
      email: `auth_u2_${ts}@test.com`,
      password: 'password123',
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.user.id).toBeGreaterThan(0);
  });

  test('POST /api/auth/register – rejects duplicate email', async () => {
    const email = `dup_${ts}@test.com`;
    await request(app).post('/api/auth/register').send({
      fullName: 'Dup',
      email,
      password: 'password123',
    });
    const res = await request(app).post('/api/auth/register').send({
      fullName: 'Dup2',
      email,
      password: 'password123',
    });
    expect(res.statusCode).toBe(409);
  });

  test('POST /api/auth/register – rejects missing name', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: `noname_${ts}@test.com`,
      password: 'password123',
    });
    expect(res.statusCode).toBe(400);
  });

  test('POST /api/auth/register – rejects missing email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      fullName: 'No Email',
      password: 'password123',
    });
    expect(res.statusCode).toBe(400);
  });

  test('POST /api/auth/register – rejects short password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      fullName: 'Short Pass',
      email: `short_${ts}@test.com`,
      password: '123',
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('Auth – login', () => {
  const loginEmail = `login_${ts}@test.com`;

  beforeAll(async () => {
    await request(app).post('/api/auth/register').send({
      fullName: 'Login Test User',
      email: loginEmail,
      password: 'mypassword1',
    });
  });

  test('POST /api/auth/login – success', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: loginEmail,
      password: 'mypassword1',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('POST /api/auth/login – wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: loginEmail,
      password: 'wrongpass',
    });
    expect(res.statusCode).toBe(401);
  });

  test('POST /api/auth/login – user not found', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody_xyz@test.com',
      password: 'anypass',
    });
    expect(res.statusCode).toBe(401);
  });

  test('POST /api/auth/login – missing credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.statusCode).toBe(400);
  });
});
