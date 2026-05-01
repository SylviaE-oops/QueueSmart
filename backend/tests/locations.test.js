const request = require('supertest');
const { app, pool } = require('../server');

let locationId;

afterAll(async () => {
  if (pool) await pool.end();
});

describe('Locations', () => {
  test('POST /api/locations – creates location 1', async () => {
    const res = await request(app).post('/api/locations').send({ name: 'Test Branch A' });
    expect(res.statusCode).toBe(201);
    locationId = res.body.locationId;
    expect(locationId).toBeGreaterThan(0);
  });

  test('POST /api/locations – creates location 2', async () => {
    const res = await request(app).post('/api/locations').send({ name: 'Test Branch B' });
    expect(res.statusCode).toBe(201);
    expect(res.body.locationId).toBeGreaterThan(0);
  });

  test('POST /api/locations – rejects missing name', async () => {
    const res = await request(app).post('/api/locations').send({});
    expect(res.statusCode).toBe(400);
  });

  test('GET /api/locations – returns list', async () => {
    const res = await request(app).get('/api/locations');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.locations)).toBe(true);
  });

  test('PUT /api/locations/:id – updates location', async () => {
    const res = await request(app)
      .put(`/api/locations/${locationId}`)
      .send({ name: 'Updated Branch A' });
    expect(res.statusCode).toBe(200);
  });

  test('PUT /api/locations/:id – rejects missing name', async () => {
    const res = await request(app).put(`/api/locations/${locationId}`).send({});
    expect(res.statusCode).toBe(400);
  });

  test('PUT /api/locations/:id – not found', async () => {
    const res = await request(app).put('/api/locations/999999').send({ name: 'X' });
    expect(res.statusCode).toBe(404);
  });

  test('DELETE /api/locations/:id – deletes temp location', async () => {
    const tmp = await request(app).post('/api/locations').send({ name: 'Temp To Delete' });
    const tmpId = tmp.body.locationId;
    const res = await request(app).delete(`/api/locations/${tmpId}`);
    expect(res.statusCode).toBe(200);
  });

  test('DELETE /api/locations/:id – not found', async () => {
    const res = await request(app).delete('/api/locations/999999');
    expect(res.statusCode).toBe(404);
  });
});
