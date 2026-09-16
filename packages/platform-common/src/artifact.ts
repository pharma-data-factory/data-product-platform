/**
 * Artifact domain model — the reusable, versioned building blocks the
 * Marketplace discovers and Products depend on.
 *
 * An Artifact is distinct from a Product: a Product is something developed,
 * operated and released; an Artifact is something reused. A Product may depend
 * on exact Artifact versions.
 *
 * The point of this model is that domain capability stays out of Core. SAP,
 * MES, LIMS, MQTT, OPC UA, AAS, Snowflake, Databricks, OEE and the rest are
 * Artifacts, not branches in platform code. Nothing here may name one.
 *
 * This module is the framework-independent contract. Persistence, the registry
 * API and the Marketplace adapter build on it.
 */

import {
  GOLDEN_PATH_LIFECYCLE_STATES,
  type DistributionChannel,
  type GoldenPathCertificationStatus,
  type GoldenPathLifecycle,
} from './releases';
import { parseVersionLabel, validateVersionLabel } from './product';

// ============================================================================
// KINDS
// ============================================================================

export const ARTIFACT_KINDS = [
  'COMPONENT',
  'CONNECTOR',
  'TEMPLATE',
  'GOLDEN_PATH',
  'DATA_PRODUCT',
  'POLICY_PACK',
  'VALIDATION_PACK',
] as const;

export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];

export function isArtifactKind(value: string): value is ArtifactKind {
  return (ARTIFACT_KINDS as readonly string[]).includes(value);
}

// ============================================================================
// LIFECYCLE
// ============================================================================

/**
 * Artifacts reuse the Golden Path lifecycle rather than declaring a parallel
 * one.
 *
 * DRAFT → TESTING → CERTIFIED → RELEASED → DEPRECATED → RETIRED already exists
 * in `releases.ts`, already has transition rules and role gating, and already
 * expresses the producer actions the strategy lists (Submit, Review, Certify,
 * Publish, Deprecate). A second enum saying nearly the same thing is the kind
 * of duplication this transformation is meant to remove, so the states are
 * shared and only the name is local to the Artifact domain.
 */
export const ARTIFACT_LIFECYCLE_STATES = GOLDEN_PATH_LIFECYCLE_STATES;

export type ArtifactLifecycle = GoldenPathLifecycle;

export type ArtifactCertificationStatus = GoldenPathCertificationStatus;

export function isArtifactLifecycle(value: string): value is ArtifactLifecycle {
  return (ARTIFACT_LIFECYCLE_STATES as readonly string[]).includes(value);
}

// ============================================================================
// IDENTITY
// ============================================================================

/**
 * Namespace and name segments.
 *
 * Lowercase, digits and single inner hyphens. The constraint is deliberately
 * tighter than "any string": a coordinate is compared, stored, put in URLs and
 * printed in provenance, so `Acme`, `acme` and `acme ` must not be three ways
 * of naming one publisher. Same reasoning as the version-label rule.
 */
const ARTIFACT_SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const ARTIFACT_SEGMENT_MAX_LENGTH = 64;

export function isArtifactSegment(value: string): boolean {
  return (
    value.length <= ARTIFACT_SEGMENT_MAX_LENGTH && ARTIFACT_SEGMENT.test(value)
  );
}

/** A specific Artifact at a specific version: `namespace/name@version`. */
export interface ArtifactCoordinate {
  namespace: string;
  name: string;
  version: string;
}

export function formatArtifactRef(coordinate: ArtifactCoordinate): string {
  return `${coordinate.namespace}/${coordinate.name}@${coordinate.version}`;
}

/**
 * Parses `namespace/name@version`, returning undefined for anything malformed.
 *
 * Callers get a value or nothing; they never get a half-parsed coordinate that
 * later turns out not to identify anything.
 */
export function parseArtifactRef(
  ref: string,
): ArtifactCoordinate | undefined {
  const match = /^([^/@]+)\/([^/@]+)@(.+)$/.exec(ref.trim());
  if (!match) {
    return undefined;
  }
  const [, namespace, name, version] = match;
  if (
    !isArtifactSegment(namespace) ||
    !isArtifactSegment(name) ||
    !parseVersionLabel(version)
  ) {
    return undefined;
  }
  return { namespace, name, version };
}

// ============================================================================
// ENTITIES
// ============================================================================

/**
 * An organisation or team that may publish Artifacts into a namespace.
 *
 * Membership is what authorises publishing, alongside the user's permission,
 * the organisation's capability and the Artifact's lifecycle state. This type
 * records who the publisher is; it does not decide authorisation — that stays
 * with the Backstage permission framework.
 */
export interface Publisher {
  id: string;
  /** Namespace this publisher owns. Unique across the registry. */
  namespace: string;
  displayName: string;
  description?: string;
  /** Catalog group refs whose members may act for this publisher. */
  memberGroups: string[];
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: Date;
  revision: number;
}

/** The Artifact itself: stable identity, independent of any one version. */
export interface Artifact {
  id: string;
  namespace: string;
  name: string;
  kind: ArtifactKind;
  displayName: string;
  description?: string;
  publisherId: string;
  /** Free-form discovery tags. Not a domain taxonomy. */
  tags?: string[];
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: Date;
  revision: number;
}

/** One released (or in-flight) version of an Artifact. */
export interface ArtifactVersion {
  id: string;
  artifactId: string;
  version: string;
  lifecycle: ArtifactLifecycle;
  certificationStatus?: ArtifactCertificationStatus;
  /** Where the content comes from. A provider reference, not domain truth. */
  sourceRef?: string;
  /** The manifest this version was registered from, verbatim. */
  manifest?: ArtifactManifest;
  distribution?: readonly DistributionChannel[];
  /** Exact Artifact refs this version needs, as `namespace/name@version`. */
  dependencies?: string[];
  releaseNotes?: string;
  createdBy: string;
  createdAt: Date;
  revision: number;
}

// ============================================================================
// MANIFEST (nexora.yaml)
// ============================================================================

/**
 * The declared shape of a `nexora.yaml`.
 *
 * Manifest-driven is the whole point: adding a connector or a Golden Path must
 * be a manifest, not a change to Core. Anything Nexora needs in order to list,
 * resolve and depend on an Artifact has to be declarable here.
 */
export interface ArtifactManifest {
  apiVersion: string;
  kind: ArtifactKind;
  metadata: {
    namespace: string;
    name: string;
    version: string;
    displayName?: string;
    description?: string;
    tags?: string[];
  };
  spec?: {
    sourceRef?: string;
    dependencies?: string[];
    distribution?: string[];
    [key: string]: unknown;
  };
}

export const ARTIFACT_MANIFEST_API_VERSION = 'nexora.dev/v1alpha1';

/**
 * Validates a parsed manifest, returning every problem rather than the first.
 *
 * A publisher fixing a manifest should see the whole list in one go; failing
 * on the first issue turns one correction into several round trips.
 */
export function validateArtifactManifest(input: unknown): string[] {
  const issues: string[] = [];

  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return ['Manifest must be a YAML mapping'];
  }
  const manifest = input as Record<string, unknown>;

  if (manifest.apiVersion !== ARTIFACT_MANIFEST_API_VERSION) {
    issues.push(
      `Unsupported apiVersion "${String(manifest.apiVersion ?? '')}": ` +
        `expected ${ARTIFACT_MANIFEST_API_VERSION}`,
    );
  }

  if (typeof manifest.kind !== 'string' || !isArtifactKind(manifest.kind)) {
    issues.push(
      `Unsupported kind "${String(manifest.kind ?? '')}": expected one of ${ARTIFACT_KINDS.join(
        ', ',
      )}`,
    );
  }

  const metadata = manifest.metadata;
  if (typeof metadata !== 'object' || metadata === null) {
    issues.push('metadata is required');
    return issues;
  }
  const meta = metadata as Record<string, unknown>;

  for (const field of ['namespace', 'name'] as const) {
    const value = meta[field];
    if (typeof value !== 'string' || !value.trim()) {
      issues.push(`metadata.${field} is required`);
    } else if (!isArtifactSegment(value)) {
      issues.push(
        `metadata.${field} "${value}" must be lowercase alphanumeric with ` +
          `single inner hyphens, at most ${ARTIFACT_SEGMENT_MAX_LENGTH} characters`,
      );
    }
  }

  const version = meta.version;
  if (typeof version !== 'string' || !version.trim()) {
    issues.push('metadata.version is required');
  } else {
    issues.push(
      ...validateVersionLabel(version).map(issue => `metadata.version: ${issue}`),
    );
  }

  if (meta.tags !== undefined && !isStringArray(meta.tags)) {
    issues.push('metadata.tags must be a list of strings');
  }

  const spec = manifest.spec;
  if (spec !== undefined) {
    if (typeof spec !== 'object' || spec === null || Array.isArray(spec)) {
      issues.push('spec must be a mapping');
    } else {
      issues.push(...validateSpec(spec as Record<string, unknown>));
    }
  }

  return issues;
}

function validateSpec(spec: Record<string, unknown>): string[] {
  const issues: string[] = [];

  if (spec.dependencies !== undefined) {
    if (!isStringArray(spec.dependencies)) {
      issues.push('spec.dependencies must be a list of strings');
    } else {
      for (const dependency of spec.dependencies) {
        // Dependencies pin an exact version. A range would make the set of
        // Artifacts a Product was built from depend on when it was resolved,
        // which is not reproducible and not something a validated Product can
        // rest on.
        if (!parseArtifactRef(dependency)) {
          issues.push(
            `spec.dependencies entry "${dependency}" must be ` +
              `namespace/name@version with an exact version`,
          );
        }
      }
    }
  }

  if (spec.distribution !== undefined && !isStringArray(spec.distribution)) {
    issues.push('spec.distribution must be a list of strings');
  }

  return issues;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

/**
 * Narrows a validated manifest.
 *
 * Kept separate from validation so callers decide what to do with the issues;
 * this only answers whether the value may be treated as a manifest.
 */
export function isArtifactManifest(input: unknown): input is ArtifactManifest {
  return validateArtifactManifest(input).length === 0;
}

/** The coordinate a manifest declares. */
export function artifactCoordinateOf(
  manifest: ArtifactManifest,
): ArtifactCoordinate {
  return {
    namespace: manifest.metadata.namespace,
    name: manifest.metadata.name,
    version: manifest.metadata.version,
  };
}
