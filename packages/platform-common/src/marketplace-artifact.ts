/**
 * The Marketplace's read of the Artifact registry.
 *
 * The Marketplace predates the registry: its offerings were a flat record with
 * a display category, not Artifacts with a namespace, a kind and a lifecycle.
 * That array is gone, and this module is what is left of the bridge — the
 * direction that turns a registered Artifact back into a card on the page.
 *
 * The other direction (offering → manifest) was the migration tool. It existed
 * to prove that every offering the Marketplace shipped could survive the trip
 * through a manifest unchanged, and to author the twelve files under
 * `catalog/artifacts/`. Those files are now the source, hand-edited like any
 * other content, so the tool has no caller and has been removed with the array.
 *
 * Two things the read deliberately does not do:
 *
 * - It does not invert the category table. A kind says what an Artifact *is*
 *   and is what every dependency on it means; a category says which shelf it
 *   sits on, and two categories may legitimately share a kind. The category is
 *   read from the manifest, and the table is used only to refuse a manifest
 *   whose category and kind disagree.
 * - It does not take a certification from the manifest. A manifest describes
 *   content; whether that content is certified is decided by review and
 *   certification, and the registry is the only thing that knows the answer.
 *   A manifest cannot state it, which is why the view this module builds from
 *   one has no `certificationStatus` field to put it in.
 *
 * Nothing here may name a domain capability. The categories are Marketplace
 * taxonomy; SAP, MQTT and OEE stay in the manifests, out of Core.
 */

import {
  validateArtifactManifest,
  type ArtifactKind,
  type ArtifactManifest,
} from './artifact';
import { parseVersionLabel } from './product';

// ============================================================================
// CATEGORY ↔ KIND
// ============================================================================

/**
 * The display categories the Marketplace sorts by, and the registry kind each
 * one belongs to.
 *
 * The two taxonomies are not the same size and never were: the registry has
 * seven kinds, the Marketplace four mapped categories. Reading a manifest uses
 * the category the manifest records rather than inverting this table, so a kind
 * shared by two categories stays unambiguous. What the table is for now is the
 * agreement check — a manifest claiming `kind: CONNECTOR` and
 * `category: Data Products` would put a card behind the wrong filter while
 * every dependency on it meant something else.
 */
export const MARKETPLACE_CATEGORY_KINDS: Readonly<
  Record<string, ArtifactKind>
> = {
  Templates: 'TEMPLATE',
  Connectors: 'CONNECTOR',
  'Data Products': 'DATA_PRODUCT',
  'Platform Components': 'COMPONENT',
};

/** The spec key the Marketplace's own fields travel under. */
export const MARKETPLACE_SPEC_KEY = 'marketplace';

export const MARKETPLACE_OFFERING_STATUSES = ['available', 'preview'] as const;

export type MarketplaceOfferingStatus =
  (typeof MARKETPLACE_OFFERING_STATUSES)[number];

/**
 * What the Marketplace shows for an Artifact the registry has never certified.
 *
 * The floor of the certification scale rather than a blank: a card has to say
 * something, and "not certified" is the true statement about every Artifact
 * that has not been through review.
 */
export const UNCERTIFIED_STATUS = 'DEVELOPMENT';

// ============================================================================
// THE OFFERING SHAPE
// ============================================================================

/**
 * The offering fields a manifest carries.
 *
 * Structural on purpose: the Marketplace plugin's own `MarketplaceItem`
 * satisfies this without Core having to import it, which keeps the dependency
 * pointing the right way. Only fields a manifest actually states are listed —
 * everything the Marketplace computes at read time (contract name, quality,
 * commercial state) is derived from live sources and has no business in a
 * manifest.
 *
 * `certificationStatus` is absent by design, not by omission. See the module
 * doc and NXD-025.
 */
export interface MarketplaceManifestView {
  id: string;
  name: string;
  category: string;
  version: string;
  description: string;
  provider: string;
  compatibility: string;
  status: string;
  documentation: string;
  templateReference?: string;
  /** Name of the composition this offering is built from, if it names one. */
  builtFrom?: string;
  catalogEntityRef?: string;
  contractApiRef?: string;
}

/**
 * A complete offering: what the manifest says, plus what the registry knows.
 *
 * The two halves have different authorities, which is the whole point of
 * keeping them in separate types until they are joined here.
 */
export interface MarketplaceOfferingView extends MarketplaceManifestView {
  certificationStatus: string;
}

// ============================================================================
// READING A MANIFEST
// ============================================================================

/**
 * The offering a manifest describes, or nothing if it describes none.
 *
 * Returning a value or nothing rather than a half-built view follows
 * `parseArtifactRef`: a caller never has to wonder whether what it got back is
 * complete. An incomplete manifest drops its card instead of rendering one with
 * invented fields — an Artifact registered by some other route is not
 * necessarily a Marketplace offering.
 */
export function marketplaceViewOfManifest(
  manifest: ArtifactManifest,
): MarketplaceManifestView | undefined {
  if (validateArtifactManifest(manifest).length > 0) {
    return undefined;
  }

  const marketplace = manifest.spec?.[MARKETPLACE_SPEC_KEY];
  if (
    typeof marketplace !== 'object' ||
    marketplace === null ||
    Array.isArray(marketplace)
  ) {
    return undefined;
  }
  const fields = marketplace as Record<string, unknown>;

  const required = (key: string): string | undefined => {
    const value = fields[key];
    return typeof value === 'string' && value.trim() ? value : undefined;
  };
  const optional = (key: string): string | undefined => {
    const value = fields[key];
    return typeof value === 'string' ? value : undefined;
  };

  const category = required('category');
  const provider = required('provider');
  const compatibility = required('compatibility');
  const status = required('status');
  const documentation = required('documentation');
  const description = manifest.metadata.description;

  if (
    !category ||
    !provider ||
    !compatibility ||
    !status ||
    !documentation ||
    !description
  ) {
    return undefined;
  }

  // A category that names no kind, or names a different one than the manifest
  // declares, is a contradiction rather than a missing feature: the card would
  // sit under a filter that disagrees with what the Artifact is.
  if (MARKETPLACE_CATEGORY_KINDS[category] !== manifest.kind) {
    return undefined;
  }

  const sourceRef = manifest.spec?.sourceRef;
  const builtFrom = manifest.spec?.builtFrom;

  return {
    id: manifest.metadata.name,
    name: manifest.metadata.displayName ?? manifest.metadata.name,
    category,
    version: manifest.metadata.version,
    description,
    provider,
    compatibility,
    status,
    documentation,
    ...(sourceRef === undefined ? {} : { templateReference: sourceRef }),
    ...(typeof builtFrom === 'string' && builtFrom
      ? { builtFrom }
      : {}),
    ...(optional('catalogEntityRef') === undefined
      ? {}
      : { catalogEntityRef: optional('catalogEntityRef') }),
    ...(optional('contractApiRef') === undefined
      ? {}
      : { contractApiRef: optional('contractApiRef') }),
  };
}

// ============================================================================
// READING THE REGISTRY
// ============================================================================

/** The shape the registry serves when versions are embedded. */
export interface RegistryArtifactWithVersions {
  namespace: string;
  name: string;
  versions: {
    version: string;
    lifecycle: string;
    /** Set by review and certification. Absent until one of them has run. */
    certificationStatus?: string;
    manifest?: unknown;
  }[];
}

/**
 * The version of an Artifact a consumer should be shown.
 *
 * A RELEASED version wins, because that is what "available" means to someone
 * choosing something to build on. Falling back to the highest version when
 * none is released is what lets a registry still filling up be readable at
 * all — and today that fallback is the only branch that runs, because nothing
 * has been through review and certification yet. That is the honest state of
 * the registry, not a gap in this function.
 */
export function representativeVersion<
  T extends { version: string; lifecycle: string },
>(versions: readonly T[]): T | undefined {
  if (versions.length === 0) {
    return undefined;
  }
  const released = versions.filter(v => v.lifecycle === 'RELEASED');
  return highestVersion(released.length > 0 ? released : versions);
}

function highestVersion<T extends { version: string }>(
  versions: readonly T[],
): T {
  return versions.reduce((best, candidate) =>
    compareVersionLabels(candidate.version, best.version) > 0 ? candidate : best,
  );
}

/** Orders two version labels; unparseable labels sort below parseable ones. */
function compareVersionLabels(left: string, right: string): number {
  const a = parseVersionLabel(left);
  const b = parseVersionLabel(right);
  if (!a || !b) {
    return (a ? 1 : 0) - (b ? 1 : 0);
  }
  return (
    a.major - b.major ||
    a.minor - b.minor ||
    (a.patch ?? 0) - (b.patch ?? 0)
  );
}

/**
 * The Marketplace offerings a registry listing describes.
 *
 * Artifacts the Marketplace cannot render — no versions, no manifest, or a
 * manifest carrying no Marketplace metadata — are dropped rather than shown
 * half-populated. Inventing the missing fields would put a card on the page
 * that nothing stands behind.
 *
 * The certification comes from the version, never from the manifest: this is
 * the join between what the content says about itself and what the registry has
 * decided about it.
 */
/**
 * The manifest of each artifact's representative version.
 *
 * The registry serves manifests verbatim, so a consumer that wants something
 * other than a Marketplace card — a composition, say — reads the same response
 * and picks what it needs. Artifacts whose representative version carries no
 * manifest are skipped rather than represented by a blank.
 */
export function manifestsFromRegistry(
  artifacts: readonly RegistryArtifactWithVersions[],
): ArtifactManifest[] {
  const manifests: ArtifactManifest[] = [];
  for (const artifact of artifacts) {
    const version = representativeVersion(artifact.versions ?? []);
    if (!version?.manifest) {
      continue;
    }
    manifests.push(version.manifest as ArtifactManifest);
  }
  return manifests;
}

export function marketplaceOfferingsFromRegistry(
  artifacts: readonly RegistryArtifactWithVersions[],
): MarketplaceOfferingView[] {
  const offerings: MarketplaceOfferingView[] = [];
  for (const artifact of artifacts) {
    const version = representativeVersion(artifact.versions ?? []);
    if (!version?.manifest) {
      continue;
    }
    const view = marketplaceViewOfManifest(version.manifest as ArtifactManifest);
    if (view) {
      offerings.push({
        ...view,
        certificationStatus: version.certificationStatus ?? UNCERTIFIED_STATUS,
      });
    }
  }
  return offerings;
}
