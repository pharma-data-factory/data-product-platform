import { sanitizeCiStatus, unknownCiStatus } from './ciStatus';
import { DataProductCiClient } from './api';

describe('sanitizeCiStatus', () => {
  it('keeps only public CI fields', () => {
    expect(
      sanitizeCiStatus({
        status: 'PASSED',
        workflowName: 'CI',
        token: 'ghs_should-not-leak',
        headers: { Authorization: 'Bearer secret' },
      }),
    ).toEqual({
      status: 'PASSED',
      representation: 'PASSED',
      workflowName: 'CI',
    });
  });

  it('falls back to UNKNOWN for invalid payloads', () => {
    expect(sanitizeCiStatus(null)).toEqual(unknownCiStatus());
    expect(sanitizeCiStatus({ status: 'CERTIFIED' }).status).toBe('UNKNOWN');
  });
});

describe('DataProductCiClient', () => {
  it('loads CI status from the backend plugin', async () => {
    const client = new DataProductCiClient({
      discoveryApi: {
        getBaseUrl: async () => 'http://backstage/api/data-products',
      },
      fetchApi: {
        fetch: async url => {
          expect(String(url)).toBe(
            'http://backstage/api/data-products/ci-status?entityRef=component%3Adefault%2Fcold-room-temperature',
          );
          return {
            ok: true,
            json: async () => ({
              status: 'PASSED',
              workflowName: 'CI',
              token: 'ghs_should-not-leak',
            }),
          } as Response;
        },
      },
    });

    await expect(
      client.getCiStatus('component:default/cold-room-temperature'),
    ).resolves.toEqual({
      status: 'PASSED',
      representation: 'PASSED',
      workflowName: 'CI',
    });
  });

  it('returns UNKNOWN when the backend is unavailable', async () => {
    const client = new DataProductCiClient({
      discoveryApi: {
        getBaseUrl: async () => {
          throw new Error('discovery failed');
        },
      },
      fetchApi: {
        fetch: async () => {
          throw new Error('should not fetch');
        },
      },
    });

    await expect(
      client.getCiStatus('component:default/cold-room-temperature'),
    ).resolves.toEqual(unknownCiStatus());
  });
});
