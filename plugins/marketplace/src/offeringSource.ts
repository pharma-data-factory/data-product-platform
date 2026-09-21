/**
 * The Marketplace's offerings, read from the Artifact registry.
 *
 * The registry is the only source. It was not always: a hard-coded array
 * (`marketplaceItems`) served the same twelve cards until the read switch
 * (NXD-022) had been proven in practice, at which point the array became a
 * fallback rather than the source, and then nothing at all — deleted once the
 * fallback had stopped earning its keep. See NXD-025.
 *
 * A registry that fails or answers with nothing is no longer papered over: it
 * surfaces as a rejected promise, which the pages already render as an error
 * state (`JourneyState`) rather than a silently substituted catalogue.
 */

import {
  marketplaceOfferingsFromRegistry,
  type MarketplaceOfferingView,
  type RegistryArtifactWithVersions,
} from '@internal/platform-common';
import type { ArtifactRegistryApi } from './artifactRegistryApi';
import {
  MARKETPLACE_CATEGORIES,
  type MarketplaceCategory,
  type MarketplaceItem,
} from './data';

/**
 * Narrows a registry-sourced offering back to a `MarketplaceItem`.
 *
 * The view's `category` and `certificationStatus` are plain strings, because
 * the adapter in Core may not depend on this plugin's unions. An offering
 * whose category is not one this Marketplace knows is dropped rather than
 * cast: the category drives filtering and the offering-kind badge, so a value
 * outside the set would produce a card that no filter can reach.
 */
export function offeringViewToItem(
  view: MarketplaceOfferingView,
): MarketplaceItem | undefined {
  if (!(MARKETPLACE_CATEGORIES as readonly string[]).includes(view.category)) {
    return undefined;
  }
  return {
    ...view,
    category: view.category as MarketplaceCategory,
    status: view.status as MarketplaceItem['status'],
    certificationStatus:
      view.certificationStatus as MarketplaceItem['certificationStatus'],
    // Phase 7 (P7-S4): publisher trust propagated from the registry.
    publisherTrustLevel: view.publisherTrustLevel ?? 'INTERNAL',
    externalPublisher: view.externalPublisher ?? false,
  };
}

export function offeringsFromRegistryResponse(
  artifacts: readonly RegistryArtifactWithVersions[],
): MarketplaceItem[] {
  return marketplaceOfferingsFromRegistry(artifacts)
    .map(offeringViewToItem)
    .filter((item): item is MarketplaceItem => item !== undefined);
}

/** The offerings to render, from the registry. */
export async function loadOfferings(
  registryApi: Pick<ArtifactRegistryApi, 'listArtifactsWithVersions'>,
): Promise<MarketplaceItem[]> {
  const artifacts = await registryApi.listArtifactsWithVersions();
  return offeringsFromRegistryResponse(artifacts);
}
