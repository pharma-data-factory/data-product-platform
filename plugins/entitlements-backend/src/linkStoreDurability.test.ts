import { ConfigReader } from '@backstage/config';
import { MarketplaceLinkStore } from './linkStore';
import { assertLinkStoreDurability, createEntitlementRuntime } from './runtime';

/**
 * The defect this covers: `MarketplaceLinkStore.persist()` returns without
 * writing when no path is configured, and returns successfully. A deployment
 * with AWS Marketplace live therefore recorded customer links, answered 200,
 * and lost them on the next restart — silently.
 */
describe('assertLinkStoreDurability', () => {
  const awsLive = { awsRegion: 'eu-central-1', awsProductCode: 'prod-abc123' };

  it('refuses a live AWS integration with no configured path', () => {
    expect(() => assertLinkStoreDurability(awsLive)).toThrow(
      /linkStorePath is not/,
    );
  });

  it('names the config key and the consequence, not just "invalid config"', () => {
    expect(() => assertLinkStoreDurability(awsLive)).toThrow(
      /commercial\.awsMarketplace\.linkStorePath/,
    );
    expect(() => assertLinkStoreDurability(awsLive)).toThrow(/lost on restart/);
  });

  it('accepts a live AWS integration with a path', () => {
    expect(() =>
      assertLinkStoreDurability({
        ...awsLive,
        linkStorePath: '/srv/links.json',
      }),
    ).not.toThrow();
  });

  // A local stack has no customer links worth keeping; volatility is correct
  // there and must not become a startup failure.
  it.each([
    ['neither region nor product code', {}],
    ['region only', { awsRegion: 'eu-central-1' }],
    ['product code only', { awsProductCode: 'prod-abc123' }],
  ])('allows a volatile store when AWS is not live (%s)', (_name, config) => {
    expect(() => assertLinkStoreDurability(config)).not.toThrow();
  });
});

describe('MarketplaceLinkStore.isVolatile', () => {
  it('reports volatility when constructed without a path', () => {
    expect(new MarketplaceLinkStore('internal', []).isVolatile).toBe(true);
  });

  it('reports durability when constructed with one', () => {
    expect(
      new MarketplaceLinkStore('internal', [], '/srv/links.json').isVolatile,
    ).toBe(false);
  });
});

describe('createEntitlementRuntime', () => {
  function configFor(awsMarketplace: Record<string, string>) {
    return new ConfigReader({
      commercial: {
        environment: 'production',
        organizationId: 'internal',
        entitlementProvider: 'aws',
        awsMarketplace,
      },
    });
  }

  it('refuses to start when AWS is live and nothing would be persisted', () => {
    expect(() =>
      createEntitlementRuntime({
        config: configFor({ region: 'eu-central-1', productCode: 'prod-abc' }),
      }),
    ).toThrow(/linkStorePath/);
  });

  it('starts when a path is configured', () => {
    expect(() =>
      createEntitlementRuntime({
        config: configFor({
          region: 'eu-central-1',
          productCode: 'prod-abc',
          linkStorePath: '/srv/links.json',
        }),
      }),
    ).not.toThrow();
  });

  // An injected store is the caller's declared choice — tests and in-memory
  // harnesses depend on being able to make it.
  it('leaves an injected store alone', () => {
    expect(() =>
      createEntitlementRuntime({
        config: configFor({ region: 'eu-central-1', productCode: 'prod-abc' }),
        linkStore: new MarketplaceLinkStore('internal', []),
      }),
    ).not.toThrow();
  });
});
