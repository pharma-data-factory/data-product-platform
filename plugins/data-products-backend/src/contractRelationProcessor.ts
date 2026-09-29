import { Entity } from '@backstage/catalog-model';
import { CatalogProcessor } from '@backstage/plugin-catalog-node';

/**
 * Makes the legacy contract annotations carry a relation.
 *
 * `toDataProduct` resolves a product's contracts through a three-tier
 * cascade: catalog `relations`, then `spec.providesApis` / `spec.consumesApis`,
 * then the annotations below. Only the first tier gives Backstage a *reverse*
 * edge — the catalog materializes `apiConsumedBy` and `apiProvidedBy` from
 * `spec.*Apis`, and those are what let a page ask "who consumes the contract
 * I provide" without reading every entity in the catalog.
 *
 * An annotation-only product has no API entity to carry that reverse edge, so
 * the only way to answer the question was to scan. This processor removes the
 * asymmetry at the source: it copies the annotation into `spec.providesApis` /
 * `spec.consumesApis` during `preProcessEntity`, and
 * `BuiltinKindsEntityProcessor` then emits both directions of the relation in
 * its own `postProcessEntity`, exactly as it does for a product that declared
 * the refs itself.
 *
 * So the annotation keeps working and the relation graph becomes uniformly
 * reliable — which is the precondition for the detail pages to resolve a
 * neighbourhood instead of the whole catalog. NXD-089.
 *
 * Nothing in this repository currently emits these annotations: every Golden
 * Path template writes real `spec.providesApis` and ships real `kind: API`
 * entities. This is for entities registered by hand or imported from
 * elsewhere, which is precisely the population that would otherwise have
 * silently lost its consumer list.
 */
export const ANNOTATION_PREFIX = 'dataprod.platform';
export const PROVIDES_CONTRACT_ANNOTATION = `${ANNOTATION_PREFIX}/providesContract`;
export const CONSUMES_CONTRACT_ANNOTATION = `${ANNOTATION_PREFIX}/consumesContract`;

/** Mirrors `parseCsv` in the frontend model, which reads the same annotation. */
function parseCsv(value?: string): string[] {
  if (!value) {
    return [];
  }
  const seen = new Set<string>();
  for (const item of value.split(',')) {
    const trimmed = item.trim();
    if (trimmed) {
      seen.add(trimmed);
    }
  }
  return [...seen];
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(item => String(item)).filter(Boolean)
    : [];
}

/** Union that keeps declaration order and drops duplicates. */
function union(declared: string[], fromAnnotation: string[]): string[] {
  return [...new Set([...declared, ...fromAnnotation])];
}

export class ContractRelationProcessor implements CatalogProcessor {
  getProcessorName(): string {
    return 'ContractRelationProcessor';
  }

  async preProcessEntity(entity: Entity): Promise<Entity> {
    if (entity.kind !== 'Component') {
      return entity;
    }

    const annotations = entity.metadata.annotations ?? {};
    const provides = parseCsv(annotations[PROVIDES_CONTRACT_ANNOTATION]);
    const consumes = parseCsv(annotations[CONSUMES_CONTRACT_ANNOTATION]);
    if (provides.length === 0 && consumes.length === 0) {
      return entity;
    }

    const spec = (entity.spec ?? {}) as Record<string, unknown>;
    const providesApis = union(asStringArray(spec.providesApis), provides);
    const consumesApis = union(asStringArray(spec.consumesApis), consumes);

    // A no-op return keeps the entity identical, which matters: the catalog
    // hashes processed entities to decide whether anything changed, and
    // rewriting spec with the same values on every refresh would churn.
    const unchanged =
      providesApis.length === asStringArray(spec.providesApis).length &&
      consumesApis.length === asStringArray(spec.consumesApis).length;
    if (unchanged) {
      return entity;
    }

    return {
      ...entity,
      spec: {
        ...spec,
        // Only written when non-empty. An empty array is a declaration that
        // the product provides nothing, which is not what a missing
        // annotation means.
        ...(providesApis.length > 0 ? { providesApis } : {}),
        ...(consumesApis.length > 0 ? { consumesApis } : {}),
      },
    };
  }
}
