import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app';

describe('info', () => {
  it('returns service metadata', async () => {
    const response = await request(app).get('/v1/info');
    expect(response.status).toBe(200);
    expect(response.body.name).toBe('${{ values.name }}');
    expect(response.body.template).toBe('nodejs-microservice');
  });
});
