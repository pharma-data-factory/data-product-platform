import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app';

describe('health', () => {
  it('returns UP with service identity', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'UP',
      service: '${{ values.name }}',
      version: '${{ values.version }}',
    });
  });
});
