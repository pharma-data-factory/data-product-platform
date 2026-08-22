import { NexoraIndustrialClient } from './api';

describe('NexoraIndustrialClient', () => {
  it('maps 404 to an unconfigured provider result', async () => {
    const client = new NexoraIndustrialClient({
      discoveryApi: { getBaseUrl: async () => 'http://nexora' },
      fetchApi: {
        fetch: async () => new Response('missing', { status: 404 }),
      },
    });
    await expect(client.getQuality('component:default/missing')).resolves.toEqual(
      expect.objectContaining({ status: 'unconfigured' }),
    );
  });

  it('maps 403 without exposing credentials', async () => {
    const client = new NexoraIndustrialClient({
      discoveryApi: { getBaseUrl: async () => 'http://nexora' },
      fetchApi: {
        fetch: async () => new Response('denied', { status: 403 }),
      },
    });
    const result = await client.getConnectivity('component:default/filler-01');
    expect(result.status).toBe('unavailable');
    expect(result.code).toBe(403);
    expect(JSON.stringify(result)).not.toMatch(/secret|token|password/i);
  });
});
