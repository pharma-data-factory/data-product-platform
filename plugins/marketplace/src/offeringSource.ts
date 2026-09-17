/**
 * Where the Marketplace's offerings come from.
 *
 * The registry is the source; `marketplaceItems` is the fallback. Both are
 * kept until the registry has been the source in practice for long enough to
 * trust, which is what the migration architecture means by proving parity
 * before removing legacy behaviour — a switch with no way back is the thing it
 * warns against.
 *
 * The fallback is deliberately silent to the user and loud to the developer:
 * a Marketplace that renders nothing because a backend is starting up is a
 * worse outcome than one that renders the same twelve cards from the array,
 * but a fallback nobody notices is how a broken read path survives a release.
 */

import {
  marketplaceOfferingsFromRegistry,
  type MarketplaceOfferingView,
  type RegistryArtifactWithVersions,
} from '@internal/platform-common';
import type { ArtifactRegistryApi } from './artifactRegistryApi';
import {
  MARKETPLACE_CATEGORIES,
  marketplaceItems,
  type MarketplaceCategory,
  type MarketplaceItem,
} from './data';

export type OfferingSourceName = 'registry' | 'legacy';

export interface OfferingSourceResult {
  items: MarketplaceItem[];
  source: OfferingSourceName;
  /** Why the fallback was used, when it was. */
  reason?: string;
}

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
  };
}

/**
 * The order the cards appear in.
 *
 * The registry returns artifacts by name, which would silently re-sort the
 * catalogue alphabetically the moment it became the source. Order is visible,
 * so changing it is changing behaviour, and parity means not doing that while
 * the switch is being proven.
 *
 * Derived from the array rather than restated, so this is not a third copy of
 * the twelve. It is also honest about what it preserves: the array's order is
 * the order offerings were added over time, not a curated one. Whether the
 * Marketplace wants a deliberate order — and if so, whether that belongs to
 * the Artifact or to the Marketplace — is a question for after the array is
 * gone, at which point this function is what gets deleted or replaced.
 */
function inLegacyOrder(items: MarketplaceItem[]): MarketplaceItem[] {
  const position = new Map(
    marketplaceItems.map((item, index) => [item.id, index]),
  );
  const unknown = marketplaceItems.length;
  return [...items].sort((a, b) => {
    const left = position.get(a.id) ?? unknown;
    const right = position.get(b.id) ?? unknown;
    // Offerings the array never had sort after it, alphabetically among
    // themselves, so a registry-only addition has a stable place rather than
    // whatever order the backend happened to return.
    return left - right || a.id.localeCompare(b.id);
  });
}

export function offeringsFromRegistryResponse(
  artifacts: readonly RegistryArtifactWithVersions[],
): MarketplaceItem[] {
  return inLegacyOrder(
    marketplaceOfferingsFromRegistry(artifacts)
      .map(offeringViewToItem)
      .filter((item): item is MarketplaceItem => item !== undefined),
  );
}

/**
 * The offerings to render, from the registry where possible.
 *
 * An empty registry falls back too. A registry that has answered successfully
 * with nothing in it is indistinguishable, from here, from one that has not
 * been loaded yet — and showing an empty Marketplace on a working
 * installation is the worse of the two mistakes.
 */
export async function loadOfferings(
  registryApi: Pick<ArtifactRegistryApi, 'listArtifactsWithVersions'>,
): Promise<OfferingSourceResult> {
  try {
    const artifacts = await registryApi.listArtifactsWithVersions();
    const items = offeringsFromRegistryResponse(artifacts);
    if (items.length === 0) {
      return {
        items: marketplaceItems,
        source: 'legacy',
        reason: 'the registry returned no renderable offerings',
      };
    }
    return { items, source: 'registry' };
  } catch (error) {
    return {
      items: marketplaceItems,
      source: 'legacy',
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}
