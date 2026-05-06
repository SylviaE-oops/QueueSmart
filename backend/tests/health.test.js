<<<<<<< HEAD
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
=======
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
>>>>>>> dc2fe2e8866336bbc255c7f3298b6922d4970bf8
