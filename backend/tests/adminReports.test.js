const request = require('supertest');
const { app, pool } = require('../server');

afterAll(async () => {
  if (pool) await pool.end();
});

describe('Admin Stats and Reports', () => {
  test('GET /api/admin/stats – returns stats', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('GET /api/admin/reports – default range (covers report helpers)', async () => {
    const res = await request(app).get('/api/admin/reports');
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('GET /api/admin/reports?range=day – day range', async () => {
    const res = await request(app).get('/api/admin/reports?range=day');
    expect(res.statusCode).toBe(200);
  });

  test('GET /api/admin/reports?range=week – week range', async () => {
    const res = await request(app).get('/api/admin/reports?range=week');
    expect(res.statusCode).toBe(200);
  });

  test('GET /api/admin/reports?range=year – year range', async () => {
    const res = await request(app).get('/api/admin/reports?range=year');
    expect(res.statusCode).toBe(200);
  });

  test('GET /api/admin/reports?range=invalid – fallback to month', async () => {
    const res = await request(app).get('/api/admin/reports?range=invalid');
    expect(res.statusCode).toBe(200);
  });
});
