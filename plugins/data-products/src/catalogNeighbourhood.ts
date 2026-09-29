import {
  Entity,
  parseEntityRef,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import type { CatalogApi } from '@backstage/catalog-client';

import {
  RELATION_API_CONSUMED_BY,
  RELATION_CONSUMES_API,
  RELATION_DEPENDENCY_OF,
  RELATION_DEPENDS_ON,
  RELATION_PROVIDES_API,
} from './model';

/**
 * Fetches just enough of the catalog to describe one product completely.
 *
 * Every detail page used to call `getEntities({ kind: ['Component','API'] })`
 * and pick its subject out of the result with a client-side `.find`. The
 * whole catalog crossed the wire so that one entity could be read from it,
 * and the payload grew with every product anyone ever registered.
 *
 * Simply resolving the one entity by ref does not work, and that is the part
 * worth stating: `withCatalogRelationships` derives a product's consumers,
 * its provider and its compatibility status *from its siblings*. Given one
 * entity it would return `consumers: []` and `UNKNOWN` — silently wrong,
 * which is worse than the slow version.
 *
 * So this resolves the product's **neighbourhood** instead, walking the
 * relations the catalog already materializes rather than searching for them:
 *
 * 1. the product, by ref;
 * 2. the API entities it provides or consumes;
 * 3. the components on the other side of those APIs — `apiConsumedBy` and
 *    `apiProvidedBy`, which the catalog emits as the reverse of
 *    `spec.providesApis` / `spec.consumesApis`;
 * 4. the components its `dependsOn` / `dependencyOf` edges name.
 *
 * Three round trips, and the result is O(neighbours) rather than O(catalog).
 * The set is then handed to the *existing* `toRelatedDataProducts`, unchanged
 * — the relationship logic is not reimplemented here, it is given a smaller
 * input. Behaviour is preserved by construction rather than by inspection.
 *
 * **The neighbourhood is complete for the subject, not for the neighbours.**
 * `toRelatedDataProducts` maps every entity in the set, so the neighbours in
 * its output carry relationships computed against a partial catalog. Take the
 * subject out of the result and disregard the rest; `resolveDataProduct`
 * below does exactly that.
 *
 * Relies on every contract edge existing as a relation. `ContractRelationProcessor`
 * in `data-products-backend` is what makes that true for entities that only
 * carry the legacy `dataprod.platform/providesContract` annotation. NXD-089.
 */

/** Relations on the product that name an API entity. */
const API_RELATIONS = [RELATION_PROVIDES_API, RELATION_CONSUMES_API];

/** Relations on an API entity that name a component on the other side. */
const API_PEER_RELATIONS = [RELATION_API_CONSUMED_BY, 'apiProvidedBy'];

/** Relations on the product that name another component directly. */
const COMPONENT_RELATIONS = [RELATION_DEPENDS_ON, RELATION_DEPENDENCY_OF];

function relationTargets(entity: Entity, types: string[]): string[] {
  return (entity.relations ?? [])
    .filter(relation => types.includes(relation.type))
    .map(relation => relation.targetRef);
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(item => String(item)).filter(Boolean)
    : [];
}

/**
 * Normalizes a name or partial ref to a full entity ref.
 *
 * `spec.providesApis` entries are conventionally bare names ("oee-contract"),
 * while relation targets are already full refs. Returns undefined rather than
 * throwing on something unparseable — one malformed ref in a spec must not
 * cost the page its entire neighbourhood.
 */
function toRef(value: string, defaultKind: string): string | undefined {
  try {
    return stringifyEntityRef(
      parseEntityRef(value, { defaultKind, defaultNamespace: 'default' }),
    );
  } catch {
    return undefined;
  }
}

function uniqueRefs(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v)))];
}

/** Drops the misses `getEntitiesByRefs` returns for refs that resolve to nothing. */
function present(items: Array<Entity | undefined>): Entity[] {
  return items.filter((item): item is Entity => Boolean(item));
}

export async function fetchProductNeighbourhood(
  catalogApi: CatalogApi,
  entityRef: string,
): Promise<Entity[]> {
  const product = await catalogApi.getEntityByRef(entityRef);
  if (!product) {
    return [];
  }

  const spec = (product.spec ?? {}) as Record<string, unknown>;
  const apiRefs = uniqueRefs([
    ...relationTargets(product, API_RELATIONS),
    ...asStringArray(spec.providesApis).map(name => toRef(name, 'api')),
    ...asStringArray(spec.consumesApis).map(name => toRef(name, 'api')),
  ]);

  const apis =
    apiRefs.length > 0
      ? present(
          (await catalogApi.getEntitiesByRefs({ entityRefs: apiRefs })).items,
        )
      : [];

  const subjectRef = stringifyEntityRef(product);
  const peerRefs = uniqueRefs([
    ...apis.flatMap(api => relationTargets(api, API_PEER_RELATIONS)),
    ...relationTargets(product, COMPONENT_RELATIONS),
  ]).filter(ref => ref !== subjectRef);

  const peers =
    peerRefs.length > 0
      ? present(
          (await catalogApi.getEntitiesByRefs({ entityRefs: peerRefs })).items,
        )
      : [];

  // Peers can name API entities too (a dependsOn pointing at one). Those are
  // harmless in the set: `toRelatedDataProducts` partitions by kind.
  return [product, ...apis, ...peers];
}
