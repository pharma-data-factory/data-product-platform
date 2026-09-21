import { createHttpCatalogComponentLoader } from './catalog-component-loader';

function fakeDiscovery(base = 'http://backstage:7007/api/catalog') {
  return { getBaseUrl: jest.fn(async () => base) };
}

function fakeAuth(token = 'test-token') {
  return {
    getPluginRequestToken: jest.fn(async () => ({ token })),
  };
}

function catalogEntity(
  name: string,
  title: string,
  category: string,
  certificationStatus: string,
  description = 'A platform component',
) {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name,
      title,
      description,
      annotations: {
        'dataprod.platform/kind': 'platform-component',
        'dataprod.platform/category': category,
        'dataprod.platform/certification-status': certificationStatus,
      },
    },
    spec: { type: 'platform-component', lifecycle: 'production' },
  };
}

describe('createHttpCatalogComponentLoader', () => {
  it('sends the correct filter and returns mapped AvailableComponentSummary objects', async () => {
    const entities = [
      catalogEntity('mqtt-consumer', 'MQTT Consumer', 'integration', 'CERTIFIED'),
      catalogEntity('health', 'Health', 'operations', 'CERTIFIED'),
    ];
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => entities,
    });

    const loader = createHttpCatalogComponentLoader({
      discovery: fakeDiscovery(),
      auth: fakeAuth(),
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    const result = await loader.loadPlatformComponents();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: 'mqtt-consumer',
      title: 'MQTT Consumer',
      category: 'integration',
      purpose: 'A platform component',
      certificationStatus: 'CERTIFIED',
    });
    expect(result[1].name).toBe('health');

    // Filter must target platform-component annotation (URL-encoded form).
    const [url] = (mockFetch as jest.Mock).mock.calls[0] as [string];
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain('dataprod.platform/kind=platform-component');
    // Auth header must be set
    const [, init] = (mockFetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer test-token');
  });

  it('returns empty list on HTTP error (graceful degradation)', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    const loader = createHttpCatalogComponentLoader({
      discovery: fakeDiscovery(),
      auth: fakeAuth(),
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    await expect(loader.loadPlatformComponents()).resolves.toEqual([]);
  });

  it('returns empty list when fetch throws (network error)', async () => {
    const mockFetch = jest.fn().mockRejectedValue(new Error('network error'));

    const loader = createHttpCatalogComponentLoader({
      discovery: fakeDiscovery(),
      auth: fakeAuth(),
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    await expect(loader.loadPlatformComponents()).resolves.toEqual([]);
  });

  it('falls back to component name when title is absent', async () => {
    const entity = {
      metadata: {
        name: 'unnamed-comp',
        annotations: {
          'dataprod.platform/category': 'data',
          'dataprod.platform/certification-status': 'DEVELOPMENT',
        },
      },
    };
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [entity],
    });

    const loader = createHttpCatalogComponentLoader({
      discovery: fakeDiscovery(),
      auth: fakeAuth(),
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    const result = await loader.loadPlatformComponents();
    expect(result[0].title).toBe('unnamed-comp');
    expect(result[0].category).toBe('data');
    expect(result[0].certificationStatus).toBe('DEVELOPMENT');
  });
});
