/**
 * Legacy Marketplace adapter — maps a Marketplace offering onto the Artifact
 * registry model, and back.
 *
 * The Marketplace predates the registry: its offerings are a flat record with
 * a display category, not Artifacts with a namespace, a kind and a lifecycle.
 * Before the Marketplace can read from the registry, every offering it shows
 * today has to survive the trip through a manifest unchanged. This module is
 * that trip, and `marketplaceViewOfManifest` is what makes it checkable rather
 * than asserted.
 *
 * Two things the mapping deliberately does not do:
 *
 * - It does not invent a registry `kind` for a category that has none. An
 *   offering whose category cannot be mapped is reported, not filed under a
 *   near-enough kind, because a wrong kind changes what every dependency on
 *   that Artifact means.
 * - It does not carry the offering's certification claim into the registry's
 *   own lifecycle. A manifest describes content; whether that content is
 *   certified is decided by review and certification, not declared by the
 *   thing being reviewed. The legacy value travels as Marketplace metadata —
 *   what the old UI displayed — and reconciling it with a real lifecycle is a
 *   later slice.
 *
 * Nothing here may name a domain capability. The categories are Marketplace
 * taxonomy; SAP, MQTT and OEE stay in the offerings, out of Core.
 */

import {
  ARTIFACT_MANIFEST_API_VERSION,
  isArtifactSegment,
  validateArtifactManifest,
  type ArtifactKind,
  type ArtifactManifest,
} from './artifact';
import { GOLDEN_PATH_CERTIFICATION_STATUSES } from './releases';
import { validateVersionLabel } from './product';

// ============================================================================
// CATEGORY → KIND
// ============================================================================

/**
 * The display categories the Marketplace sorts by, and the registry kind each
 * one becomes.
 *
 * The two taxonomies are not the same size and never were: the registry has
 * seven kinds describing what an Artifact *is*, the Marketplace has categories
 * describing which shelf it sits on. The mapping is therefore one-way. Reading
 * back uses the category recorded in the manifest rather than inverting this
 * table, so a kind shared by two categories stays unambiguous.
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

// ============================================================================
// THE OFFERING SHAPE
// ============================================================================

/**
 * The stored fields of a Marketplace offering.
 *
 * Structural on purpose: the Marketplace plugin's own `MarketplaceItem`
 * satisfies this without Core having to import it, which keeps the dependency
 * pointing the right way. Only fields an offering actually carries are listed
 * — everything the Marketplace computes at read time (contract name, quality,
 * commercial state) is derived from live sources and has no business in a
 * manifest.
 */
export interface MarketplaceOffering {
  id: string;
  name: string;
  category: string;
  version: string;
  description: string;
  provider: string;
  compatibility: string;
  status: string;
  certificationStatus: string;
  documentation: string;
  templateReference?: string;
  catalogEntityRef?: string;
  contractApiRef?: string;
}

/** What a manifest gives back: the same stored fields, nothing added. */
export interface MarketplaceOfferingView {
  id: string;
  name: string;
  category: string;
  version: string;
  description: string;
  provider: string;
  compatibility: string;
  status: string;
  certificationStatus: string;
  documentation: string;
  templateReference?: string;
  catalogEntityRef?: string;
  contractApiRef?: string;
}

// ============================================================================
// NAMESPACE
// ============================================================================

/**
 * The namespace a provider publishes into.
 *
 * A provider is a display name ("Nexora"); a namespace is an identifier that
 * ends up in coordinates, URLs and provenance. Slugifying is a convenience for
 * the legacy data, not a rule the registry relies on — a provider whose name
 * does not reduce to a valid segment gets nothing back rather than a mangled
 * namespace, and the caller has to say what the namespace should be.
 */
export function marketplaceNamespaceFor(provider: string): string | undefined {
  const slug = provider
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return isArtifactSegment(slug) ? slug : undefined;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Every reason an offering cannot become a manifest, not just the first.
 *
 * Same contract as `validateArtifactManifest`: whoever is fixing the data sees
 * the whole list in one pass.
 */
export function validateMarketplaceOffering(input: unknown): string[] {
  const issues: string[] = [];

  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return ['Offering must be an object'];
  }
  const offering = input as Record<string, unknown>;

  for (const field of [
    'id',
    'name',
    'category',
    'version',
    'description',
    'provider',
    'compatibility',
    'status',
    'certificationStatus',
    'documentation',
  ] as const) {
    const value = offering[field];
    if (typeof value !== 'string' || !value.trim()) {
      issues.push(`${field} is required`);
    }
  }

  for (const field of [
    'templateReference',
    'catalogEntityRef',
    'contractApiRef',
  ] as const) {
    const value = offering[field];
    if (value !== undefined && typeof value !== 'string') {
      issues.push(`${field} must be a string when present`);
    }
  }

  // The id becomes the Artifact name, so it has to already be a coordinate
  // segment. Rewriting it here would change the identity the Marketplace links
  // to and the templates key off.
  const id = offering.id;
  if (typeof id === 'string' && id.trim() && !isArtifactSegment(id)) {
    issues.push(
      `id "${id}" cannot be an artifact name: must be lowercase ` +
        `alphanumeric with single inner hyphens`,
    );
  }

  const category = offering.category;
  if (
    typeof category === 'string' &&
    category.trim() &&
    !MARKETPLACE_CATEGORY_KINDS[category]
  ) {
    issues.push(
      `category "${category}" has no artifact kind: mapped categories are ` +
        `${Object.keys(MARKETPLACE_CATEGORY_KINDS).join(', ')}`,
    );
  }

  const version = offering.version;
  if (typeof version === 'string' && version.trim()) {
    issues.push(...validateVersionLabel(version).map(issue => `version: ${issue}`));
  }

  const provider = offering.provider;
  if (
    typeof provider === 'string' &&
    provider.trim() &&
    !marketplaceNamespaceFor(provider)
  ) {
    issues.push(
      `provider "${provider}" does not reduce to a valid namespace segment`,
    );
  }

  const status = offering.status;
  if (
    typeof status === 'string' &&
    status.trim() &&
    !(MARKETPLACE_OFFERING_STATUSES as readonly string[]).includes(status)
  ) {
    issues.push(
      `status "${status}" is not one of ${MARKETPLACE_OFFERING_STATUSES.join(', ')}`,
    );
  }

  const certification = offering.certificationStatus;
  if (
    typeof certification === 'string' &&
    certification.trim() &&
    !(GOLDEN_PATH_CERTIFICATION_STATUSES as readonly string[]).includes(
      certification,
    )
  ) {
    issues.push(
      `certificationStatus "${certification}" is not one of ` +
        `${GOLDEN_PATH_CERTIFICATION_STATUSES.join(', ')}`,
    );
  }

  return issues;
}

// ============================================================================
// FORWARD
// ============================================================================

/**
 * The manifest an offering becomes, or nothing if it cannot become one.
 *
 * Returning a value or nothing rather than a half-built manifest follows
 * `parseArtifactRef`: a caller never has to wonder whether what it got back is
 * complete. Call `validateMarketplaceOffering` when the reasons matter.
 */
export function marketplaceOfferingToManifest(
  offering: MarketplaceOffering,
): ArtifactManifest | undefined {
  if (validateMarketplaceOffering(offering).length > 0) {
    return undefined;
  }

  const namespace = marketplaceNamespaceFor(offering.provider);
  const kind = MARKETPLACE_CATEGORY_KINDS[offering.category];
  if (!namespace || !kind) {
    return undefined;
  }

  return {
    apiVersion: ARTIFACT_MANIFEST_API_VERSION,
    kind,
    metadata: {
      namespace,
      name: offering.id,
      version: offering.version,
      displayName: offering.name,
      description: offering.description,
    },
    spec: {
      // The scaffolder template is where this offering's content comes from,
      // which is exactly what sourceRef means. Offerings without one — the
      // preview entries — simply have no source yet.
      ...(offering.templateReference === undefined
        ? {}
        : { sourceRef: offering.templateReference }),
      [MARKETPLACE_SPEC_KEY]: {
        category: offering.category,
        provider: offering.provider,
        compatibility: offering.compatibility,
        status: offering.status,
        certificationStatus: offering.certificationStatus,
        documentation: offering.documentation,
        ...(offering.catalogEntityRef === undefined
          ? {}
          : { catalogEntityRef: offering.catalogEntityRef }),
        ...(offering.contractApiRef === undefined
          ? {}
          : { contractApiRef: offering.contractApiRef }),
      },
    },
  };
}

// ============================================================================
// BACK
// ============================================================================

/**
 * The offering a manifest describes, or nothing if it describes none.
 *
 * This is the half that makes parity a test rather than a claim: run the
 * offerings the Marketplace ships through both directions and the result has
 * to equal what went in.
 */
export function marketplaceViewOfManifest(
  manifest: ArtifactManifest,
): MarketplaceOfferingView | undefined {
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
  const certificationStatus = required('certificationStatus');
  const documentation = required('documentation');
  const description = manifest.metadata.description;

  if (
    !category ||
    !provider ||
    !compatibility ||
    !status ||
    !certificationStatus ||
    !documentation ||
    !description
  ) {
    return undefined;
  }

  const sourceRef = manifest.spec?.sourceRef;

  return {
    id: manifest.metadata.name,
    name: manifest.metadata.displayName ?? manifest.metadata.name,
    category,
    version: manifest.metadata.version,
    description,
    provider,
    compatibility,
    status,
    certificationStatus,
    documentation,
    ...(sourceRef === undefined ? {} : { templateReference: sourceRef }),
    ...(optional('catalogEntityRef') === undefined
      ? {}
      : { catalogEntityRef: optional('catalogEntityRef') }),
    ...(optional('contractApiRef') === undefined
      ? {}
      : { contractApiRef: optional('contractApiRef') }),
  };
}

/** The stored fields of an offering, with the computed ones dropped. */
export function marketplaceOfferingView(
  offering: MarketplaceOffering,
): MarketplaceOfferingView {
  return {
    id: offering.id,
    name: offering.name,
    category: offering.category,
    version: offering.version,
    description: offering.description,
    provider: offering.provider,
    compatibility: offering.compatibility,
    status: offering.status,
    certificationStatus: offering.certificationStatus,
    documentation: offering.documentation,
    ...(offering.templateReference === undefined
      ? {}
      : { templateReference: offering.templateReference }),
    ...(offering.catalogEntityRef === undefined
      ? {}
      : { catalogEntityRef: offering.catalogEntityRef }),
    ...(offering.contractApiRef === undefined
      ? {}
      : { contractApiRef: offering.contractApiRef }),
  };
}
