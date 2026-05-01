const request = require('supertest');
const { app, pool } = require('../server');

let locationId;
let location2Id;
let serviceId;
let service2Id;

beforeAll(async () => {
  const loc1 = await request(app).post('/api/locations').send({ name: 'Svc Test Branch A' });
  locationId = loc1.body.locationId;

  const loc2 = await request(app).post('/api/locations').send({ name: 'Svc Test Branch B' });
  location2Id = loc2.body.locationId;
});

afterAll(async () => {
  if (pool) await pool.end();
});

describe('Services', () => {
  test('POST /api/services – creates service 1 (open)', async () => {
    const res = await request(app).post('/api/services').send({
      name: 'Service A (Open)',
      description: 'Primary test service',
      isOpen: true,
      locationId,
    });
    expect(res.statusCode).toBe(201);
    serviceId = res.body.serviceId;
    expect(serviceId).toBeGreaterThan(0);
  });

  test('POST /api/services – creates service 2', async () => {
    const res = await request(app).post('/api/services').send({
      name: 'Service B (Closed)',
      description: 'Secondary test service',
      isOpen: false,
      locationId: location2Id,
    });
    expect(res.statusCode).toBe(201);
    service2Id = res.body.serviceId;
    expect(service2Id).toBeGreaterThan(0);
  });

  test('POST /api/services – rejects missing name', async () => {
    const res = await request(app).post('/api/services').send({ description: 'No name' });
    expect(res.statusCode).toBe(400);
  });

  test('POST /api/services – rejects missing description', async () => {
    const res = await request(app).post('/api/services').send({ name: 'No Desc' });
    expect(res.statusCode).toBe(400);
  });

  test('GET /api/services – returns list', async () => {
    const res = await request(app).get('/api/services');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.services)).toBe(true);
  });

  test('PUT /api/services/:id – updates service', async () => {
    const res = await request(app).put(`/api/services/${serviceId}`).send({
      name: 'Service A (Renamed)',
      description: 'Updated description',
      isOpen: true,
      locationId,
    });
    expect(res.statusCode).toBe(200);
  });

  test('PUT /api/services/:id – close service 2', async () => {
    const res = await request(app).put(`/api/services/${service2Id}`).send({
      name: 'Service B (Closed)',
      description: 'Closed',
      isOpen: false,
    });
    expect(res.statusCode).toBe(200);
  });

  test('PUT /api/services/:id – reopen service 2', async () => {
    const res = await request(app).put(`/api/services/${service2Id}`).send({
      name: 'Service B (Open Again)',
      description: 'Reopened',
      isOpen: true,
    });
    expect(res.statusCode).toBe(200);
  });

  test('PUT /api/services/:id – rejects missing name', async () => {
    const res = await request(app).put(`/api/services/${serviceId}`).send({ description: 'no name' });
    expect(res.statusCode).toBe(400);
  });

  test('PUT /api/services/:id – does not return 404 for unknown id (no check)', async () => {
    const res = await request(app).put('/api/services/999999').send({
      name: 'Ghost',
      description: 'Nonexistent service',
    });
    expect(res.statusCode).toBe(200);
  });
});
