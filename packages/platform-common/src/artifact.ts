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
  DISTRIBUTION_CHANNELS,
  GOLDEN_PATH_LIFECYCLE_STATES,
  type DistributionChannel,
  type GoldenPathCertificationStatus,
  type GoldenPathLifecycle,
} from './releases';
import {
  COORDINATE_SEGMENT_MAX_LENGTH,
  isNameSegment,
  parseVersionLabel,
  validateReleaseProvenance,
  validateVersionLabel,
  type DataContractSchemaType,
} from './product';
import type { ConfigKeySchema } from './platform-component-library';

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
export const ARTIFACT_SEGMENT_MAX_LENGTH = COORDINATE_SEGMENT_MAX_LENGTH;

/**
 * Delegates to the shared coordinate grammar in `product.ts`.
 *
 * The regex used to be duplicated here. It is the same rule for Artifacts and
 * DataContracts, and two copies of a grammar are two things that can drift.
 */
export function isArtifactSegment(value: string): boolean {
  return isNameSegment(value);
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

// ── Publisher Trust (Phase 7, P7-S1) ─────────────────────────────────────────

/**
 * Trust tier for a Publisher namespace.
 *
 * `INTERNAL`  — a Nexora-operated namespace (e.g. `nexora`). Artifacts are
 *               maintained by the platform team and carry the highest trust.
 *               Platform guardrails treat these as first-party.
 *
 * `PARTNER`   — a certified external publisher that has passed a formal review.
 *               Displayed with a "Partner" badge; eligible for the commercial
 *               marketplace. Onboarding requires PLATFORM_ADMIN approval.
 *
 * `COMMUNITY` — an external publisher that has not yet been certified. Artifacts
 *               are displayed with a disclaimer. Not eligible for commercial
 *               marketplace or certification workflows until the publisher is
 *               promoted to PARTNER.
 */
export const PUBLISHER_TRUST_LEVELS = [
  'INTERNAL',
  'PARTNER',
  'COMMUNITY',
] as const;

export type PublisherTrustLevel = (typeof PUBLISHER_TRUST_LEVELS)[number];

export function isPublisherTrustLevel(value: string): value is PublisherTrustLevel {
  return (PUBLISHER_TRUST_LEVELS as readonly string[]).includes(value);
}

/**
 * An organisation or team that may publish Artifacts into a namespace.
 *
 * Membership is what authorises publishing, alongside the user's permission,
 * the organisation's capability and the Artifact's lifecycle state. This type
 * records who the publisher is; it does not decide authorisation — that stays
 * with the Backstage permission framework.
 *
 * Phase 7 (P7-S1): `trustLevel` and `externalPublisher` added.
 */
export interface Publisher {
  id: string;
  /** Namespace this publisher owns. Unique across the registry. */
  namespace: string;
  displayName: string;
  description?: string;
  /** Catalog group refs whose members may act for this publisher. */
  memberGroups: string[];
  /**
   * Trust tier. Defaults to `'INTERNAL'` for Nexora-managed namespaces.
   * External publishers created via self-service start as `'COMMUNITY'`.
   * Phase 7 (P7-S1).
   */
  trustLevel: PublisherTrustLevel;
  /**
   * True when this publisher is outside the Nexora organisation.
   * Drives Marketplace display (disclaimer, Partner badge) and permission
   * scoping. Phase 7 (P7-S1).
   */
  externalPublisher: boolean;
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
  /**
   * The release build this version is (NXD-137): the image a runnable
   * artifact installs as, and the commit and release it came from. Written
   * once, at registration, like everything else on a version (NXD-030).
   * Absent for a version that is not a build — a template, a policy pack, a
   * listing — and for a runnable version registered by hand, which then
   * cannot be certified or published.
   */
  releaseBuild?: ArtifactReleaseBuild;
  createdBy: string;
  createdAt: Date;
  revision: number;
}

export interface ArtifactReleaseBuild {
  /** Equals the manifest's `spec.runtime.image.repository`. */
  imageRepository: string;
  /** `sha256:<64 hex>`. Never authored in the manifest (NXD-130). */
  imageDigest: string;
  /** Full commit SHA the image was built from. */
  commitSha: string;
  /** Where the build was published, e.g. the GitHub Release page. */
  releaseUrl?: string;
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
    /**
     * SPDX license expression, e.g. `Apache-2.0` or `MIT OR Apache-2.0`
     * (NXD-130). Optional for now; a community or commercial artifact that
     * states no license cannot be reused by anyone who reads one.
     */
    license?: string;
  };
  spec?: {
    sourceRef?: string;
    /** The GOLDEN_PATH composition this artifact is built from. */
    builtFrom?: string;
    dependencies?: string[];
    distribution?: string[];
    /**
     * Platform editions this artifact ships with.
     *
     * The axis `distribution` was mistaken for. An edition is an installation
     * shape — `nexora-core`, `nexora-life-sciences` — and a distribution
     * channel is a commercial packaging tier. NXD-075 removed a manifest that
     * declared `distribution: [life-sciences]`; this is where that statement
     * belongs, spelled with the edition's real id.
     *
     * Absent means available everywhere. An artifact with no stated audience
     * is not a secret.
     */
    editions?: string[];
    standardVersion?: string;
    components?: ArtifactCompositionComponent[];
    usage?: ArtifactCompositionUsage;
    /**
     * Policy Pack references that apply to this Artifact (W2-4).
     *
     * A `policy` entry is a coordinate (`namespace/name@version`) pointing at
     * a POLICY_PACK Artifact. The platform resolves these at certification time
     * to determine which policies a Product must satisfy before release.
     *
     * Example:
     *   policies:
     *     - "nexora/gxp-data-product-policy@1.0.0"
     *     - "nexora/gdpr-data-handling-policy@2.1.0"
     */
    policies?: string[];
    /**
     * Requirements that this Artifact implements or satisfies (W2-4).
     * References to requirement IDs in the URS system.
     */
    requirements?: string[];
    /**
     * Policy document for POLICY_PACK kind artifacts.
     * Typed so the Policy Pack Resolver can read obligations without casting.
     * Consumers (nexora.yaml authors) declare obligations here; the resolver reads them.
     */
    policyDocument?: {
      version?: number;
      supportedVersions?: number[];
      obligations?: Array<{
        id: string;
        title: string;
        check: string;
        appliesTo: string;
        message: string;
        note?: string;
      }>;
    };
    /** How the artifact runs. Runnable kinds only (NXD-130). */
    runtime?: ArtifactRuntime;
    /** APIs and events the artifact provides and consumes (NXD-130). */
    interfaces?: ArtifactInterface[];
    /**
     * Install-time configuration. The same entry shape as a Platform
     * Component's `configurationSchema` (W2-2), not a second one.
     */
    config?: ConfigKeySchema[];
    [key: string]: unknown;
  };
}

// ── Runtime, interfaces, config (NXD-129, NXD-130) ───────────────────────────
//
// The authoritative statement of these shapes is `nexora-manifest.schema.json`;
// `manifestSchema.test.ts` holds the vocabularies below and the schema's enums
// in step.

/** Kinds that run, and may therefore declare runtime, interfaces and config. */
export const RUNNABLE_ARTIFACT_KINDS = ['DATA_PRODUCT', 'CONNECTOR'] as const;

/**
 * What a runtime provider is asked to run. One value: every provider in view
 * (Docker Compose, Kubernetes, an edge agent) runs containers. A second kind is
 * a schema change, which is the right cost for a new execution model.
 */
export const ARTIFACT_RUNTIME_KINDS = ['container'] as const;

export const ARTIFACT_PORT_PROTOCOLS = ['tcp', 'udp'] as const;

export const ARTIFACT_HEALTH_CHECK_TYPES = ['http', 'tcp'] as const;

/** `api` is request/response over a port; `event` is a message channel. */
export const ARTIFACT_INTERFACE_TYPES = ['api', 'event'] as const;

export const ARTIFACT_INTERFACE_DIRECTIONS = ['provides', 'consumes'] as const;

/**
 * The container a runtime provider runs.
 *
 * Provider-neutral by construction: nothing here names Compose, Kubernetes or a
 * host. Where it runs, with which broker and which values, is an installation's
 * business (NXD-129).
 */
export interface ArtifactRuntime {
  kind: (typeof ARTIFACT_RUNTIME_KINDS)[number];
  image: {
    /**
     * Fully qualified repository without tag or digest, e.g.
     * `ghcr.io/acme/oee-line-1`. The tag is `metadata.version`; the digest is
     * recorded when the version is released, never authored (NXD-130).
     */
    repository: string;
  };
  ports?: ArtifactRuntimePort[];
  health?: ArtifactHealthCheck;
  resources?: {
    limits?: {
      /** Kubernetes quantity: `500m`, `1`, `1.5`. */
      cpu?: string;
      /** Kubernetes quantity: `512Mi`, `2Gi`. */
      memory?: string;
    };
  };
  /** State kept across a restart or an upgrade (NXD-142). */
  storage?: ArtifactRuntimeStorage[];
}

/**
 * One persistent area the provider supplies per installation. What backs it
 * and whether it outlives the installation are the target's and the
 * installation's to decide, not the author's (NXD-142).
 */
export interface ArtifactRuntimeStorage {
  name: string;
  /** Absolute container path, e.g. `/app/data`. */
  mountPath: string;
  /** Kubernetes quantity the workload expects: `1Gi`. A hint, not a limit. */
  size?: string;
  description?: string;
}

export interface ArtifactRuntimePort {
  /** Referenced by health checks and api interfaces. */
  name: string;
  containerPort: number;
  protocol?: (typeof ARTIFACT_PORT_PROTOCOLS)[number];
}

export interface ArtifactHealthCheck {
  type: (typeof ARTIFACT_HEALTH_CHECK_TYPES)[number];
  /** A port name from `runtime.ports`. */
  port: string;
  /** Required for `http`. */
  path?: string;
}

export interface ArtifactInterface {
  name: string;
  type: (typeof ARTIFACT_INTERFACE_TYPES)[number];
  direction: (typeof ARTIFACT_INTERFACE_DIRECTIONS)[number];
  description?: string;
  /** DataContract coordinate, `namespace/name@version` (NXD-048). */
  contract?: string;
  /** The machine-readable description, relative to the repository root. */
  document?: {
    type: DataContractSchemaType;
    path: string;
  };
  /** api only: the runtime port name it is served on. Required to provide one. */
  port?: string;
  /** api only. */
  basePath?: string;
  /**
   * event only: logical channel, e.g. `equipment/{equipmentId}/state`. The
   * broker topic it maps to is bound at installation, not here.
   */
  channel?: string;
  /**
   * event only: transports this implementation can actually be bound to —
   * `mqtt` today for every template. Open vocabulary, NXD-049's grammar. It
   * states the coupling that exists rather than hiding it.
   */
  mechanisms?: string[];
}

/** How a composition presents itself where components list their consumers. */
export const ARTIFACT_COMPOSITION_USAGE_KINDS = [
  'runtime',
  'conceptual',
  'design',
] as const;

export type ArtifactCompositionUsageKind =
  (typeof ARTIFACT_COMPOSITION_USAGE_KINDS)[number];

/**
 * What a component's "used by" line says about this composition.
 *
 * `label` is stated rather than derived from `displayName`: the two genuinely
 * differ — a composition titled "MQTT Temperature (conceptual)" is listed as
 * "MQTT Temperature", while "Equipment Use Log (design example)" keeps its
 * parenthetical. Deriving one from the other would be a rule with exceptions
 * in it. Before this field the pair lived only in Core, as
 * `LIBRARY_COMPOSITION_USAGE`.
 *
 * Absent means the composition is not listed at all, which is how the two
 * example compositions behave.
 */
export interface ArtifactCompositionUsage {
  kind: ArtifactCompositionUsageKind;
  label: string;
}

/**
 * One Platform Component a composition is built from.
 *
 * `ref` is a Backstage Catalog entity ref, not an Artifact ref, and that is
 * deliberate: Platform Components are Catalog entities, so a composition
 * points at the Catalog rather than restating it. This is why the list lives
 * here and not in `spec.dependencies`, which pins exact Artifact versions and
 * would reject an entity ref outright. See NXD-027.
 *
 * `version` is a constraint (`1.x`), not a pin, because it constrains a
 * Catalog entity whose version the registry does not govern.
 */
export interface ArtifactCompositionComponent {
  ref: string;
  version: string;
  /** Offered rather than required. Absent means required. */
  optional?: boolean;
}

/**
 * Whether a version declares how it runs, and so needs a release build before
 * it may be certified or published (NXD-137, R8). Decided by the manifest, not
 * the kind: a DATA_PRODUCT listing without `spec.runtime` is a description of
 * an offering, not something an installation could run.
 */
export function isRunnableArtifactVersion(
  version: Pick<ArtifactVersion, 'manifest'>,
): boolean {
  return version.manifest?.spec?.runtime !== undefined;
}

/**
 * Why `build` cannot be recorded on a version registered from `manifest`, or
 * `[]` if it can. The commit and digest grammars are NXD-052's; the image
 * must be the one the manifest says it runs, or the record would describe a
 * different artifact from the one it is attached to.
 */
export function validateArtifactReleaseBuild(
  build: Partial<ArtifactReleaseBuild>,
  manifest: ArtifactManifest,
): string[] {
  const issues: string[] = [];
  if (!(RUNNABLE_ARTIFACT_KINDS as readonly string[]).includes(manifest.kind)) {
    issues.push(`a ${manifest.kind} has no release build; only runnable kinds do`);
  }
  const declared = manifest.spec?.runtime?.image?.repository;
  if (!declared) {
    issues.push('the manifest declares no spec.runtime.image.repository to build');
  } else if (build.imageRepository !== declared) {
    issues.push(
      `release build image "${String(build.imageRepository)}" is not the ` +
        `manifest's spec.runtime.image.repository "${declared}"`,
    );
  }
  issues.push(
    ...validateReleaseProvenance({
      releaseCommitSha: build.commitSha,
      artifactDigest: build.imageDigest,
    }).map(issue =>
      issue
        .replace('releaseCommitSha', 'release build commitSha')
        .replace('artifactDigest', 'release build imageDigest'),
    ),
  );
  if (build.releaseUrl !== undefined && !/^https:\/\/\S+$/.test(build.releaseUrl)) {
    issues.push(`release build releaseUrl "${build.releaseUrl}" is not an https URL`);
  }
  return issues;
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
      issues.push(
        ...validateSpec(
          spec as Record<string, unknown>,
          manifest.kind as string,
        ),
      );
    }
  }

  return issues;
}

function validateSpec(spec: Record<string, unknown>, kind: string): string[] {
  const issues: string[] = [];

  // A composition whose component list is missing or malformed resolves to an
  // empty composition, which is a silently wrong answer rather than a loud
  // one. The list is the entire content of this kind, so it is required.
  if (kind === 'GOLDEN_PATH') {
    issues.push(...validateCompositionComponents(spec.components));
    issues.push(...validateCompositionUsage(spec.usage));
  } else {
    if (spec.components !== undefined) {
      issues.push(`spec.components is only meaningful for kind GOLDEN_PATH`);
    }
    if (spec.usage !== undefined) {
      issues.push(`spec.usage is only meaningful for kind GOLDEN_PATH`);
    }
  }

  // Only a kind that runs can say how it runs (NXD-130). The sections' own
  // shape is checked against the schema at the registry's gate
  // (`validateRunnableManifestSections`); this rule needs no schema engine, so
  // it holds wherever a manifest is read.
  if (!(RUNNABLE_ARTIFACT_KINDS as readonly string[]).includes(kind)) {
    for (const section of ['runtime', 'interfaces', 'config'] as const) {
      if (spec[section] !== undefined) {
        issues.push(
          `spec.${section} is only meaningful for kinds ` +
            `${RUNNABLE_ARTIFACT_KINDS.join(', ')}`,
        );
      }
    }
  }

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

  // Checked against the vocabulary, not merely for shape. `ArtifactVersion
  // .distribution` is typed `DistributionChannel[]` and the registry used to
  // cast a manifest's strings into it unchecked — so `distribution:
  // [life-sciences]`, a value from the *edition* axis, was stored as though it
  // were a distribution channel. It went unnoticed because nothing reads the
  // persisted field: every consumer of `.distribution` reads it off
  // `GoldenPathRelease`, a different object. A discriminator nobody checks and
  // nobody reads is two problems, not one. NXD-075.
  if (spec.distribution !== undefined) {
    if (!isStringArray(spec.distribution)) {
      issues.push('spec.distribution must be a list of strings');
    } else {
      for (const channel of spec.distribution) {
        if (!(DISTRIBUTION_CHANNELS as readonly string[]).includes(channel)) {
          issues.push(
            `spec.distribution entry "${channel}" is not a distribution ` +
              `channel. Expected one of ${DISTRIBUTION_CHANNELS.join(', ')}. ` +
              'Which editions ship an artifact is a different axis and is ' +
              'declared in catalog/editions.yaml, not here.',
          );
        }
      }
    }
  }

  // Editions are validated for shape only. Whether an id names a declared
  // edition is a question for the installation that loads the catalogue, not
  // for a manifest read in isolation — a vendor's artifact may legitimately
  // name an edition this installation has never heard of.
  if (spec.editions !== undefined && !isStringArray(spec.editions)) {
    issues.push('spec.editions must be a list of strings');
  }

  // W2-4: validate spec.policies and spec.requirements
  if (spec.policies !== undefined) {
    if (!isStringArray(spec.policies)) {
      issues.push('spec.policies must be a list of strings');
    } else {
      for (const policy of spec.policies) {
        // A policy reference is namespace/name@version — same format as a dependency.
        const coord = parseArtifactRef(policy);
        if (!coord || !coord.version || coord.version === 'latest' || coord.version === '*') {
          issues.push(
            `spec.policies entry "${policy}" must be namespace/name@exact-version`,
          );
        }
      }
    }
  }

  if (spec.requirements !== undefined && !isStringArray(spec.requirements)) {
    issues.push('spec.requirements must be a list of strings (requirement IDs)');
  }

  return issues;
}

function validateCompositionComponents(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return ['spec.components must be a list for kind GOLDEN_PATH'];
  }
  if (value.length === 0) {
    return ['spec.components must name at least one component'];
  }

  const issues: string[] = [];
  const seen = new Set<string>();
  value.forEach((item, index) => {
    const path = `spec.components[${index}]`;
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      issues.push(`${path} must be a mapping`);
      return;
    }
    const entry = item as Record<string, unknown>;
    const ref = entry.ref;
    if (typeof ref !== 'string' || !ref.trim()) {
      issues.push(`${path}.ref is required`);
    } else if (seen.has(ref)) {
      // The same component twice is either a copy-paste slip or an attempt to
      // say something the format cannot express. Either way the resolved list
      // would not match the file.
      issues.push(`${path}.ref "${ref}" is listed more than once`);
    } else {
      seen.add(ref);
    }
    if (typeof entry.version !== 'string' || !entry.version.trim()) {
      issues.push(`${path}.version is required`);
    }
    if (entry.optional !== undefined && typeof entry.optional !== 'boolean') {
      issues.push(`${path}.optional must be a boolean`);
    }
  });
  return issues;
}

function validateCompositionUsage(value: unknown): string[] {
  // Absent is meaningful: the composition is simply not listed as a consumer.
  if (value === undefined) {
    return [];
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return ['spec.usage must be a mapping'];
  }
  const usage = value as Record<string, unknown>;
  const issues: string[] = [];
  if (
    typeof usage.kind !== 'string' ||
    !(ARTIFACT_COMPOSITION_USAGE_KINDS as readonly string[]).includes(
      usage.kind,
    )
  ) {
    issues.push(
      `spec.usage.kind must be one of ${ARTIFACT_COMPOSITION_USAGE_KINDS.join(
        ', ',
      )}`,
    );
  }
  if (typeof usage.label !== 'string' || !usage.label.trim()) {
    issues.push('spec.usage.label is required');
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

// ── Platform Editions (W3-8) ──────────────────────────────────────────────────
//
// Moved to ./editions.ts, where they gained the `extends` resolution this file
// only claimed to do. Re-exported so existing importers keep working. NXD-078.

export type {
  PlatformEdition,
  EditionCatalogue,
  ResolvedEdition,
} from './editions';
export {
  editionHasCapability,
  resolveEditions,
  validateEditionCatalogue,
  artifactAvailableInEdition,
} from './editions';
