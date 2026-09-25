import { useEffect, useState } from 'react';
import {
  discoveryApiRef,
  fetchApiRef,
  useApi,
} from '@backstage/core-plugin-api';

/**
 * The Composer Product that claims this Catalog entity, if one does.
 *
 * The other half of Step 2. A Product is described by two records — the Catalog
 * entity a consumer reads, and the Composer row that carries versions,
 * baselines, requirements and the release gate — and until the
 * `nexora:product:create` action wrote `catalogEntityRef`, nothing joined them.
 * This is the reverse direction: entity ref in, product out.
 *
 * **By reference, not by name.** `LineageDAGView` in this plugin looks the
 * Composer up by product *name*, which is a heuristic: names are free text, not
 * identity, and two products may share one. The route this calls answers from a
 * unique index on the entity ref, so it has exactly one answer or none.
 *
 * Absent is the normal case and not an error: most Catalog entities are not
 * Nexora Products, and one created before Step 2 has no claim on file. The hook
 * returns `undefined` and the caller shows nothing. A failing Composer is the
 * same outcome — a governance cross-link that cannot resolve must not put an
 * error panel on a consumer's page.
 */
export interface GoverningProduct {
  id: string;
  name: string;
  lifecycle?: string;
}

export function useGoverningProduct(
  entityRef: string | undefined,
): { product?: GoverningProduct; loading: boolean } {
  const discoveryApi = useApi(discoveryApiRef);
  const fetchApi = useApi(fetchApiRef);
  const [product, setProduct] = useState<GoverningProduct>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!entityRef) {
      setProduct(undefined);
      return undefined;
    }
    let active = true;
    setLoading(true);
    setProduct(undefined);

    (async () => {
      try {
        const base = await discoveryApi.getBaseUrl('composer');
        // fetchApi, not bare fetch: the route is behind product.read, and an
        // unauthenticated call would 401 rather than answer.
        const response = await fetchApi.fetch(
          `${base}/products/by-entity-ref?ref=${encodeURIComponent(entityRef)}`,
        );
        if (!active) {
          return;
        }
        if (response.ok) {
          setProduct((await response.json()) as GoverningProduct);
        }
        // 404 means no product claims this entity, which is ordinary.
      } catch {
        // A cross-link is not worth an error state on a page about something
        // else.
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [discoveryApi, fetchApi, entityRef]);

  return { product, loading };
}
