/**
 * Golden Path compositions, read from the Artifact Registry.
 *
 * Compositions became GOLDEN_PATH Artifacts in NXD-027, which put their
 * component lists somewhere a browser can reach. This hook is the read switch
 * for the pages that used to import those lists as constants from Core: the
 * Composer, the Platform Component library and detail pages, the Developer Hub
 * and the Marketplace detail page.
 *
 * It lives beside the registry client rather than in `packages/app` because
 * more than one plugin needs it, and `packages/app` is a composition layer.
 *
 * Failure is surfaced, not swallowed. A page that cannot reach the registry
 * shows an error rather than an empty "used by" list, which would read as
 * "nothing uses this component" — a wrong answer dressed as a real one. This
 * is the same rule NXD-026 applied to the offerings.
 */

import { useApi } from '@backstage/core-plugin-api';
import { useEffect, useState } from 'react';
import {
  compositionOfArtifactManifest,
  compositionUsageFromManifests,
  manifestsFromRegistry,
  type ArtifactManifest,
  type CompositionUsage,
  type GoldenPathComposition,
} from '@internal/platform-common';
import { artifactRegistryApiRef } from './artifactRegistryApi';

export interface GoldenPathCompositions {
  /** Every composition in the registry, by name. */
  byName: Map<string, GoldenPathComposition>;
  /** The "used by" table the component library renders. */
  usage: CompositionUsage[];
}

export const EMPTY_COMPOSITIONS: GoldenPathCompositions = {
  byName: new Map(),
  usage: [],
};

export function goldenPathCompositionsFromManifests(
  manifests: readonly ArtifactManifest[],
): GoldenPathCompositions {
  const byName = new Map<string, GoldenPathComposition>();
  for (const manifest of manifests) {
    const composition = compositionOfArtifactManifest(manifest);
    if (composition) {
      byName.set(composition.metadata.name, composition);
    }
  }
  return { byName, usage: compositionUsageFromManifests(manifests) };
}

/** The component refs of one composition, or an empty list if absent. */
export function compositionRefs(
  compositions: GoldenPathCompositions,
  name: string,
): string[] {
  const composition = compositions.byName.get(name);
  if (!composition) {
    return [];
  }
  return composition.spec.components
    .filter(entry => !entry.optional)
    .map(entry => entry.ref);
}

/** The refs a composition offers but does not require. */
export function optionalCompositionRefs(
  compositions: GoldenPathCompositions,
  name: string,
): string[] {
  const composition = compositions.byName.get(name);
  if (!composition) {
    return [];
  }
  return composition.spec.components
    .filter(entry => entry.optional)
    .map(entry => entry.ref);
}

export function useGoldenPathCompositions(): {
  compositions: GoldenPathCompositions;
  loading: boolean;
  error?: Error;
} {
  const registryApi = useApi(artifactRegistryApiRef);
  const [compositions, setCompositions] =
    useState<GoldenPathCompositions>(EMPTY_COMPOSITIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    let active = true;
    registryApi
      .listArtifactsWithVersions()
      .then(artifacts => {
        if (!active) {
          return;
        }
        setCompositions(
          goldenPathCompositionsFromManifests(manifestsFromRegistry(artifacts)),
        );
        setLoading(false);
      })
      .catch(caught => {
        if (!active) {
          return;
        }
        setError(caught instanceof Error ? caught : new Error(String(caught)));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [registryApi]);

  return { compositions, loading, error };
}
