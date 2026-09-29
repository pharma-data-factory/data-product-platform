import { Entity } from '@backstage/catalog-model';
import type { CatalogApi } from '@backstage/catalog-client';

import { fetchProductNeighbourhood } from './catalogNeighbourhood';
import { toRelatedDataProducts } from './model';

/**
 * The defect: seven detail pages fetched every Component and API in the
 * catalog and picked their subject out with a client-side `.find`. The
 * payload grew with the catalog; the page needed one entity.
 *
 * Resolving the one entity by ref is not equivalent — `withCatalogRelationships`
 * derives consumers, provider and compatibility from siblings, so a lone
 * entity yields `consumers: []` and `UNKNOWN`. These tests pin both halves:
 * that the neighbourhood is bounded, and that what it produces for the
 * subject matches what the full scan produced.
 */

function product(
  name: string,
  opts: {
    provides?: string[];
    consumes?: string[];
    relations?: Array<{ type: string; targetRef: string }>;
  } = {},
): Entity {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: { name, title: name, namespace: 'default' },
    spec: {
      type: 'data-product',
      owner: 'team-a',
      lifecycle: 'production',
      ...(opts.provides ? { providesApis: opts.provides } : {}),
      ...(opts.consumes ? { consumesApis: opts.consumes } : {}),
    },
    relations: opts.relations ?? [],
  } as Entity;
}

function api(
  name: string,
  relations: Array<{ type: string; targetRef: string }> = [],
): Entity {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'API',
    metadata: {
      name,
      namespace: 'default',
      annotations: { 'dataprod.platform/contract-version': '1.2.0' },
    },
    spec: { type: 'asyncapi', owner: 'team-a' },
    relations,
  } as Entity;
}

/** A fake catalog that also counts what was asked of it. */
function fakeCatalog(entities: Entity[]) {
  const byRef = new Map(
    entities.map(e => [
      `${e.kind.toLowerCase()}:${e.metadata.namespace ?? 'default'}/${
        e.metadata.name
      }`,
      e,
    ]),
  );
  const calls = { getEntities: 0, getEntityByRef: 0, getEntitiesByRefs: 0 };
  const refsRequested: string[] = [];

  const catalogApi = {
    getEntityByRef: async (ref: string) => {
      calls.getEntityByRef += 1;
      refsRequested.push(ref);
      return byRef.get(ref);
    },
    getEntitiesByRefs: async ({ entityRefs }: { entityRefs: string[] }) => {
      calls.getEntitiesByRefs += 1;
      refsRequested.push(...entityRefs);
      return { items: entityRefs.map(ref => byRef.get(ref)) };
    },
    getEntities: async () => {
      calls.getEntities += 1;
      return { items: entities };
    },
  } as unknown as CatalogApi;

  return { catalogApi, calls, refsRequested };
}

// provider --providesApi--> oee-contract <--consumesApi-- consumer
const OEE_CONTRACT = api('oee-contract', [
  { type: 'apiProvidedBy', targetRef: 'component:default/provider' },
  { type: 'apiConsumedBy', targetRef: 'component:default/consumer' },
]);
const PROVIDER = product('provider', {
  provides: ['oee-contract'],
  relations: [{ type: 'providesApi', targetRef: 'api:default/oee-contract' }],
});
const CONSUMER = product('consumer', {
  consumes: ['oee-contract'],
  relations: [{ type: 'consumesApi', targetRef: 'api:default/oee-contract' }],
});
/** Present in the catalog, connected to nothing. Must never be fetched. */
const UNRELATED = product('unrelated-product');

const WORLD = [PROVIDER, CONSUMER, UNRELATED, OEE_CONTRACT];

describe('fetchProductNeighbourhood', () => {
  it('returns the product, its APIs and the components on the other side', async () => {
    const { catalogApi } = fakeCatalog(WORLD);

    const set = await fetchProductNeighbourhood(
      catalogApi,
      'component:default/provider',
    );

    expect(set.map(e => e.metadata.name).sort()).toEqual([
      'consumer',
      'oee-contract',
      'provider',
    ]);
  });

  it('never fetches the whole catalog', async () => {
    const { catalogApi, calls } = fakeCatalog(WORLD);

    await fetchProductNeighbourhood(catalogApi, 'component:default/provider');

    expect(calls.getEntities).toBe(0);
  });

  it('leaves unrelated products untouched', async () => {
    const { catalogApi, refsRequested } = fakeCatalog(WORLD);

    await fetchProductNeighbourhood(catalogApi, 'component:default/provider');

    expect(refsRequested).not.toContain('component:default/unrelated-product');
  });

  it('walks apiProvidedBy so a consumer reaches its provider', async () => {
    const { catalogApi } = fakeCatalog(WORLD);

    const set = await fetchProductNeighbourhood(
      catalogApi,
      'component:default/consumer',
    );

    expect(set.map(e => e.metadata.name).sort()).toEqual([
      'consumer',
      'oee-contract',
      'provider',
    ]);
  });

  it('resolves bare spec refs when no relation has been emitted yet', async () => {
    // A freshly registered entity the catalog has not stitched yet: spec
    // names the API, relations are still empty.
    const unstitched = product('provider', { provides: ['oee-contract'] });
    const { catalogApi } = fakeCatalog([unstitched, CONSUMER, OEE_CONTRACT]);

    const set = await fetchProductNeighbourhood(
      catalogApi,
      'component:default/provider',
    );

    expect(set.map(e => e.metadata.name)).toContain('oee-contract');
  });

  it('is empty when the product does not exist', async () => {
    const { catalogApi } = fakeCatalog(WORLD);

    expect(
      await fetchProductNeighbourhood(catalogApi, 'component:default/nope'),
    ).toEqual([]);
  });

  it('survives a ref the catalog cannot resolve', async () => {
    const dangling = product('provider', {
      provides: ['oee-contract'],
      relations: [{ type: 'providesApi', targetRef: 'api:default/deleted' }],
    });
    const { catalogApi } = fakeCatalog([dangling, OEE_CONTRACT]);

    const set = await fetchProductNeighbourhood(
      catalogApi,
      'component:default/provider',
    );

    expect(set.map(e => e.metadata.name)).toEqual(['provider', 'oee-contract']);
  });

  it('survives an unparseable ref in spec without losing the rest', async () => {
    const malformed = product('provider', {
      provides: ['oee-contract', 'not::a::ref'],
    });
    const { catalogApi } = fakeCatalog([malformed, OEE_CONTRACT, CONSUMER]);

    const set = await fetchProductNeighbourhood(
      catalogApi,
      'component:default/provider',
    );

    expect(set.map(e => e.metadata.name)).toContain('oee-contract');
  });
});

/**
 * The assertion the change actually rests on. Anything less than this is a
 * claim that the neighbourhood is enough; this measures it.
 */
describe('parity with the full-catalog scan', () => {
  it.each(['provider', 'consumer'])(
    'produces the same DataProduct for %s as scanning everything',
    async name => {
      const { catalogApi } = fakeCatalog(WORLD);

      const fromScan = toRelatedDataProducts(WORLD).find(p => p.name === name);
      const fromNeighbourhood = toRelatedDataProducts(
        await fetchProductNeighbourhood(
          catalogApi,
          `component:default/${name}`,
        ),
      ).find(p => p.name === name);

      expect(fromNeighbourhood).toEqual(fromScan);
    },
  );

  // The specific values a naive getEntityByRef would have silently lost.
  it('keeps the consumer list and compatibility status the scan produced', async () => {
    const { catalogApi } = fakeCatalog(WORLD);

    const resolved = toRelatedDataProducts(
      await fetchProductNeighbourhood(catalogApi, 'component:default/provider'),
    ).find(p => p.name === 'provider');

    expect(resolved?.usedBy).toEqual(['consumer']);
    expect(resolved?.compatibilityStatus).not.toBe('UNKNOWN');
  });
});
