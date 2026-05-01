const request = require('supertest');
const { app, pool } = require('../server');

afterAll(async () => {
  if (pool) await pool.end();
});

describe('Health', () => {
  test('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
