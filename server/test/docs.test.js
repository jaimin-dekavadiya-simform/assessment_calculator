'use strict';

const request = require('supertest');
const app = require('../src/app');

describe('GET /openapi.yaml', () => {
  it('serves the OpenAPI document as YAML', async () => {
    const response = await request(app).get('/openapi.yaml');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/yaml/);
    expect(response.text).toContain('openapi:');
    expect(response.text).toContain('/api/v1/calculate');
  });
});

describe('GET /docs', () => {
  it('serves the Swagger UI HTML', async () => {
    const response = await request(app).get('/docs');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/html/);
    expect(response.text).toContain('id="swagger-ui"');
  });
});
