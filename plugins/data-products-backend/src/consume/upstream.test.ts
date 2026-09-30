import type { Entity } from '@backstage/catalog-model';
import { isBlockedAddress, resolveUpstream } from './upstream';

function entity(annotations: Record<string, string>, name = 'product-a'): Entity {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: { name, annotations },
    spec: { type: 'data-product' },
  };
}

const publicLookup = async () => ['93.184.216.34'];

describe('isBlockedAddress (NXD-091)', () => {
  it.each([
    '127.0.0.1',
    '127.255.0.9',
    '10.1.2.3',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '::1',
    '::',
    'fd00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
    '::ffff:169.254.169.254',
    'not-an-ip',
  ])('blocks %s', address => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  it.each(['93.184.216.34', '172.32.0.1', '8.8.8.8', '2606:4700::1111'])(
    'allows %s',
    address => {
      expect(isBlockedAddress(address)).toBe(false);
    },
  );
});

describe('resolveUpstream (NXD-091)', () => {
  it('returns none when neither config nor annotation names an upstream', async () => {
    expect(
      await resolveUpstream(entity({}), { baseUrls: {}, allowedOrigins: [] }),
    ).toEqual({ kind: 'none' });
  });

  it('trusts an operator-configured loopback base, keyed by name or template', async () => {
    // The Model Company upstream is loopback, and it is configuration.
    expect(
      await resolveUpstream(entity({}, 'checkweigher-01-oee'), {
        baseUrls: { 'checkweigher-01-oee': 'http://127.0.0.1:18080' },
        allowedOrigins: [],
      }),
    ).toEqual({
      kind: 'upstream',
      url: 'http://127.0.0.1:18080/api/v1',
      source: 'config',
    });
    expect(
      await resolveUpstream(
        entity({ 'dataprod.platform/template': 'oee-data-product' }),
        {
          baseUrls: { 'oee-data-product': 'http://10.0.0.5/' },
          allowedOrigins: [],
        },
      ),
    ).toMatchObject({ kind: 'upstream', url: 'http://10.0.0.5/api/v1' });
  });

  it('prefers configuration over the annotation', async () => {
    const result = await resolveUpstream(
      entity(
        { 'dataprod.platform/consume-base-url': 'http://169.254.169.254' },
        'checkweigher-01-oee',
      ),
      {
        baseUrls: { 'checkweigher-01-oee': 'http://127.0.0.1:18080' },
        allowedOrigins: [],
      },
    );
    expect(result).toMatchObject({ kind: 'upstream', source: 'config' });
  });

  it('ignores an annotation whose origin is not allow-listed', async () => {
    expect(
      await resolveUpstream(
        entity({
          'dataprod.platform/consume-base-url': 'https://data.example.com',
        }),
        { baseUrls: {}, allowedOrigins: [], lookup: publicLookup },
      ),
    ).toEqual({ kind: 'refused', reason: 'UPSTREAM_ORIGIN_NOT_ALLOWED' });
  });

  it('follows an allow-listed annotation that resolves to public addresses', async () => {
    expect(
      await resolveUpstream(
        entity({
          'dataprod.platform/consume-base-url': 'https://data.example.com/',
          'dataprod.platform/consume-rest-path': '/api/v1/oee',
        }),
        {
          baseUrls: {},
          allowedOrigins: ['https://DATA.example.com:443/'],
          lookup: publicLookup,
        },
      ),
    ).toEqual({
      kind: 'upstream',
      url: 'https://data.example.com/api/v1/oee',
      source: 'annotation',
    });
  });

  it.each([
    'http://127.0.0.1:18080',
    'http://169.254.169.254',
    'http://10.0.0.1',
    'http://192.168.0.10',
    'http://[::1]',
    'http://2130706433',
  ])('refuses an allow-listed annotation naming a private literal: %s', async base => {
    // Even the operator's allow-list cannot open the annotation path to the
    // Control Plane's own network; that is what configuration is for.
    const origin = new URL(base).origin;
    expect(
      await resolveUpstream(
        entity({ 'dataprod.platform/consume-base-url': base }),
        { baseUrls: {}, allowedOrigins: [origin] },
      ),
    ).toEqual({ kind: 'refused', reason: 'UPSTREAM_ADDRESS_NOT_PUBLIC' });
  });

  it('refuses an allow-listed hostname if any resolved address is private', async () => {
    expect(
      await resolveUpstream(
        entity({ 'dataprod.platform/consume-base-url': 'https://data.example.com' }),
        {
          baseUrls: {},
          allowedOrigins: ['https://data.example.com'],
          lookup: async () => ['93.184.216.34', '10.0.0.7'],
        },
      ),
    ).toEqual({ kind: 'refused', reason: 'UPSTREAM_ADDRESS_NOT_PUBLIC' });
  });

  it('refuses an unresolvable annotation host', async () => {
    expect(
      await resolveUpstream(
        entity({ 'dataprod.platform/consume-base-url': 'https://data.example.com' }),
        {
          baseUrls: {},
          allowedOrigins: ['https://data.example.com'],
          lookup: async () => {
            throw new Error('ENOTFOUND');
          },
        },
      ),
    ).toEqual({ kind: 'refused', reason: 'UPSTREAM_UNRESOLVABLE' });
  });

  it('refuses non-http schemes and embedded credentials', async () => {
    for (const base of ['file:///etc/passwd', 'https://user:pw@data.example.com']) {
      expect(
        await resolveUpstream(
          entity({ 'dataprod.platform/consume-base-url': base }),
          {
            baseUrls: {},
            allowedOrigins: ['https://data.example.com'],
            lookup: publicLookup,
          },
        ),
      ).toEqual({ kind: 'refused', reason: 'UPSTREAM_URL_INVALID' });
    }
  });

  it.each(['@evil.example/x', '//evil.example/x', '\\\\evil.example', 'api/v1', '/\\evil.example'])(
    'refuses a rest path that could leave the base origin: %s',
    async restPath => {
      // The path is catalog-authored even when the base is configuration.
      expect(
        await resolveUpstream(
          entity(
            { 'dataprod.platform/consume-rest-path': restPath },
            'checkweigher-01-oee',
          ),
          {
            baseUrls: { 'checkweigher-01-oee': 'http://127.0.0.1:18080' },
            allowedOrigins: [],
          },
        ),
      ).toEqual({ kind: 'refused', reason: 'UPSTREAM_PATH_INVALID' });
    },
  );
});
