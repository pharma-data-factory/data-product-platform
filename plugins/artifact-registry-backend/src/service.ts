/**
 * Artifact Registry service — the rules that make a registry a registry.
 *
 * Registering is manifest-driven: a publisher hands over a `nexora.yaml` and
 * the registry decides whether it may become a version. Nothing here knows
 * what SAP, MQTT or OEE are; a new capability is a manifest, not a branch.
 */

import { randomUUID } from 'crypto';
import { parse as parseYaml } from 'yaml';
import {
  ConflictError,
  InputError,
  NotAllowedError,
  NotFoundError,
  ServiceUnavailableError,
} from '@backstage/errors';
import {
  formatArtifactRef,
  isArtifactSegment,
  isPublisherTrustLevel,
  parseArtifactRef,
  validateArtifactManifest,
  validateRunnableManifestSections,
  artifactAvailableInEdition,
  DISTRIBUTION_CHANNELS,
  PUBLISHER_TRUST_LEVELS,
  type Artifact,
  type ArtifactCertificationStatus,
  type ArtifactCoordinate,
  type ArtifactLifecycle,
  type ArtifactManifest,
  type ArtifactVersion,
  type DistributionChannel,
  type ResolvedEdition,
  type Publisher,
  isRunnableArtifactVersion,
  validateArtifactReleaseBuild,
  type ArtifactReleaseBuild,
  type ArtifactReleaseStatus,
  type ArtifactTransitionAct,
} from '@internal/platform-common';
import type { ArtifactRegistryRepository } from './repository';

/**
 * Asks the Composer whether a product version registered as this coordinate
 * is RELEASED (NXD-146). Throws when the Composer cannot answer.
 */
export type ReleaseStatusReader = (
  coordinate: ArtifactCoordinate,
) => Promise<ArtifactReleaseStatus>;

export interface CreatePublisherRequest {
  namespace: string;
  displayName: string;
  description?: string;
  memberGroups?: string[];
  /**
   * Trust level. Defaults to `'INTERNAL'` for programmatic creation (e.g.
   * the manifest loader). Self-registered external publishers start as
   * `'COMMUNITY'`; PLATFORM_ADMIN can promote to `'PARTNER'`.
   * Phase 7 (P7-S1).
   */
  trustLevel?: string;
  /** Whether this publisher is outside the Nexora organisation. Phase 7 (P7-S1). */
  externalPublisher?: boolean;
}

export interface RegisterArtifactVersionResult {
  artifact: Artifact;
  version: ArtifactVersion;
  /** True when this registration also created the Artifact itself. */
  artifactCreated: boolean;
}

export class ArtifactRegistryService {
  /**
   * @param edition This installation's resolved edition, when one is
   *   configured. Absent means no edition scoping — everything is visible,
   *   which is the honest reading of "the operator has not asked to be
   *   restricted" and the behaviour every installation had before NXD-078.
   */
  constructor(
    private readonly repository: ArtifactRegistryRepository,
    private readonly edition?: ResolvedEdition,
    /**
     * NXD-146. Without it nothing can be published: the release gate cannot
     * be asked, and an unasked gate is not a passed one.
     */
    private readonly readReleaseStatus?: ReleaseStatusReader,
  ) {}

  /**
   * The versions of an artifact this installation may see.
   *
   * Scoping is per version, because the manifest is where `spec.editions` is
   * declared and a manifest belongs to a version. An artifact whose every
   * version is scoped elsewhere disappears entirely — it has nothing to show.
   */
  private visibleVersions(versions: ArtifactVersion[]): ArtifactVersion[] {
    if (!this.edition) return versions;
    return versions.filter(version =>
      artifactAvailableInEdition(
        (version.manifest as ArtifactManifest | undefined)?.spec?.editions,
        this.edition,
      ),
    );
  }

  // -- publishers ----------------------------------------------------------

  async createPublisher(
    request: CreatePublisherRequest,
    actor: string,
  ): Promise<Publisher> {
    const namespace = (request.namespace ?? '').trim();
    if (!isArtifactSegment(namespace)) {
      throw new InputError(
        `Invalid publisher namespace "${namespace}": must be lowercase ` +
          `alphanumeric with single inner hyphens`,
      );
    }
    if (!request.displayName?.trim()) {
      throw new InputError('Publisher displayName is required');
    }

    // A namespace is owned by exactly one publisher. Without this, two
    // publishers could claim the same coordinate prefix and provenance would
    // no longer say who produced an Artifact.
    const existing = await this.repository.getPublisherByNamespace(namespace);
    if (existing) {
      throw new ConflictError(
        `Namespace "${namespace}" is already owned by publisher ${existing.id}`,
      );
    }

    // Phase 7 (P7-S1): validate and default trust level.
    let trustLevel: Publisher['trustLevel'] = 'INTERNAL';
    if (request.trustLevel) {
      if (!isPublisherTrustLevel(request.trustLevel)) {
        throw new InputError(
          `Invalid trustLevel "${request.trustLevel}". Expected one of: ${PUBLISHER_TRUST_LEVELS.join(', ')}`,
        );
      }
      trustLevel = request.trustLevel;
    }

    const publisher: Publisher = {
      id: randomUUID(),
      namespace,
      displayName: request.displayName.trim(),
      description: request.description,
      memberGroups: request.memberGroups ?? [],
      trustLevel,
      externalPublisher: request.externalPublisher ?? false,
      createdBy: actor,
      createdAt: new Date(),
      revision: 1,
    };
    return this.repository.createPublisher(publisher);
  }

  async listPublishers(): Promise<Publisher[]> {
    return this.repository.listPublishers();
  }

  async getPublisherByNamespace(
    namespace: string,
  ): Promise<Publisher | undefined> {
    return this.repository.getPublisherByNamespace(namespace);
  }

  /**
   * Promote a COMMUNITY publisher to PARTNER or update trust level.
   * Only PLATFORM_ADMIN may call this (enforced at the router layer).
   * 7-R3: Publisher PARTNER promotion workflow.
   */
  async promotePublisher(
    id: string,
    trustLevel: Publisher['trustLevel'],
    memberGroups?: string[],
  ): Promise<Publisher> {
    const publisher = await this.repository.getPublisher(id);
    if (!publisher) {
      throw new NotFoundError(`Publisher ${id} not found`);
    }
    if (!isPublisherTrustLevel(trustLevel)) {
      throw new InputError(
        `Invalid trustLevel "${trustLevel}". Expected: ${PUBLISHER_TRUST_LEVELS.join(', ')}`,
      );
    }
    const updated = await this.repository.updatePublisher(id, {
      trustLevel,
      memberGroups,
    });
    if (!updated) throw new NotFoundError(`Publisher ${id} not found after update`);
    return updated;
  }

  // -- registration --------------------------------------------------------

  /**
   * Registers one version of an Artifact from its manifest.
   *
   * Creates the Artifact on first sight of a coordinate, then adds the
   * version. A version always starts in DRAFT: publishing is a separate,
   * governed act, so registering content can never by itself make it
   * available to consumers.
   */
  async registerArtifactVersion(
    input: unknown,
    actor: string,
    /** NXD-137: the release build a runnable version is, written once. */
    releaseBuild?: ArtifactReleaseBuild,
  ): Promise<RegisterArtifactVersionResult> {
    // The runtime, interface, config and license sections are checked against
    // the published schema here, at the one gate every manifest passes, rather
    // than in validateArtifactManifest, which the browser also runs (NXD-130).
    const issues = [
      ...validateArtifactManifest(input),
      ...validateRunnableManifestSections(input),
    ];
    if (issues.length > 0) {
      throw new InputError(`Invalid artifact manifest: ${issues.join('; ')}`);
    }
    const manifest = input as ArtifactManifest;
    const { namespace, name, version } = manifest.metadata;
    if (releaseBuild) {
      const buildIssues = validateArtifactReleaseBuild(releaseBuild, manifest);
      if (buildIssues.length > 0) {
        throw new InputError(`Invalid release build: ${buildIssues.join('; ')}`);
      }
    }

    const publisher = await this.repository.getPublisherByNamespace(namespace);
    if (!publisher) {
      // Namespace ownership is what ties an Artifact to an accountable
      // publisher. Registering into an unclaimed namespace would produce
      // Artifacts nobody is answerable for.
      throw new NotFoundError(
        `No publisher owns namespace "${namespace}". Register the publisher first.`,
      );
    }

    let artifact = await this.repository.getArtifactByCoordinate(
      namespace,
      name,
    );
    let artifactCreated = false;

    if (artifact) {
      // The kind is part of what an Artifact *is*. Letting version 2 of a
      // CONNECTOR arrive as a TEMPLATE would change the meaning of every
      // dependency already pointing at it.
      if (artifact.kind !== manifest.kind) {
        throw new ConflictError(
          `Artifact ${namespace}/${name} is a ${artifact.kind}; ` +
            `manifest declares ${manifest.kind}`,
        );
      }
      const clash = await this.repository.getArtifactVersion(
        artifact.id,
        version,
      );
      if (clash) {
        throw new ConflictError(
          `${formatArtifactRef({ namespace, name, version })} is already registered`,
        );
      }
    } else {
      artifact = await this.repository.createArtifact({
        id: randomUUID(),
        namespace,
        name,
        kind: manifest.kind,
        displayName: manifest.metadata.displayName?.trim() || name,
        description: manifest.metadata.description,
        publisherId: publisher.id,
        tags: manifest.metadata.tags ?? [],
        createdBy: actor,
        createdAt: new Date(),
        revision: 1,
      });
      artifactCreated = true;
    }

    const dependencies = manifest.spec?.dependencies ?? [];
    await this.assertDependenciesResolvable(dependencies);

    const created = await this.repository.createArtifactVersion({
      id: randomUUID(),
      artifactId: artifact.id,
      version,
      lifecycle: 'DRAFT',
      sourceRef: manifest.spec?.sourceRef,
      manifest,
      // Narrowed, not cast. The cast that used to be here is what let
      // `distribution: [life-sciences]` — a value from the edition axis — be
      // stored as a DistributionChannel. `validateArtifactManifest` now checks
      // the vocabulary, so anything reaching this line is already a member;
      // the guard keeps that true if a caller ever bypasses validation.
      // NXD-075.
      distribution: manifest.spec?.distribution?.filter(
        (channel): channel is DistributionChannel =>
          (DISTRIBUTION_CHANNELS as readonly string[]).includes(channel),
      ),
      dependencies,
      ...(releaseBuild
        ? {
            releaseBuild: {
              imageRepository: releaseBuild.imageRepository,
              imageDigest: releaseBuild.imageDigest.toLowerCase(),
              commitSha: releaseBuild.commitSha.toLowerCase(),
              ...(releaseBuild.releaseUrl ? { releaseUrl: releaseBuild.releaseUrl } : {}),
            },
          }
        : {}),
      createdBy: actor,
      createdAt: new Date(),
      revision: 1,
    });

    return { artifact, version: created, artifactCreated };
  }

  /**
   * Registers the release build of a runnable product as a DRAFT version
   * (NXD-137): the `nexora.yaml` read from the tagged commit, as text, plus
   * the image, digest, commit and release the build produced.
   *
   * Idempotent for the same build: a coordinate already registered with the
   * same digest answers that version with `alreadyRegistered`. The same
   * coordinate with a different digest is a 409 — a version is one artifact
   * (NXD-030), and a rebuilt image under the same version is a new version,
   * not a correction.
   */
  async registerReleaseBuild(
    request: { manifest?: unknown; release?: Partial<ArtifactReleaseBuild> },
    actor: string,
  ): Promise<RegisterArtifactVersionResult & { alreadyRegistered: boolean }> {
    if (typeof request.manifest !== 'string' || !request.manifest.trim()) {
      throw new InputError('manifest must be the nexora.yaml text of the release');
    }
    let manifest: unknown;
    try {
      manifest = parseYaml(request.manifest);
    } catch (error) {
      throw new InputError(
        `manifest is not YAML: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    const release = (request.release ?? {}) as ArtifactReleaseBuild;

    const metadata = (manifest as ArtifactManifest | undefined)?.metadata;
    if (metadata?.namespace && metadata?.name && metadata?.version) {
      const artifact = await this.repository.getArtifactByCoordinate(
        metadata.namespace,
        metadata.name,
      );
      const existing = artifact
        ? await this.repository.getArtifactVersion(artifact.id, metadata.version)
        : undefined;
      if (artifact && existing) {
        const digest = existing.releaseBuild?.imageDigest;
        if (digest && digest === String(release.imageDigest ?? '').toLowerCase()) {
          return {
            artifact,
            version: existing,
            artifactCreated: false,
            alreadyRegistered: true,
          };
        }
        const registeredAs = digest ? `as ${digest}` : 'without a release build';
        throw new ConflictError(
          `${formatArtifactRef(metadata)} is already registered ${registeredAs}. ` +
            'A rebuilt image is a new version: bump metadata.version and tag again.',
        );
      }
    }

    const result = await this.registerArtifactVersion(manifest, actor, release);
    return { ...result, alreadyRegistered: false };
  }

  /**
   * Every declared dependency must already exist in the registry.
   *
   * A version whose dependencies cannot be resolved is not reproducible, and
   * Phase 4's change-impact analysis has to be able to walk the graph without
   * hitting coordinates that were never registered.
   */
  private async assertDependenciesResolvable(
    dependencies: readonly string[],
  ): Promise<void> {
    const unresolved: string[] = [];
    for (const ref of dependencies) {
      const coordinate = parseArtifactRef(ref);
      if (!coordinate) {
        unresolved.push(ref);
        continue;
      }
      const found = await this.resolve(coordinate);
      if (!found) {
        unresolved.push(ref);
      }
    }
    if (unresolved.length > 0) {
      throw new InputError(
        `Unresolvable artifact dependencies: ${unresolved.join(', ')}`,
      );
    }
  }

  // -- reads ---------------------------------------------------------------

  async listArtifacts(filter?: {
    kind?: Artifact['kind'];
    namespace?: string;
  }): Promise<Artifact[]> {
    const artifacts = await this.repository.listArtifacts(filter);
    // Fast path, and the only path before an edition is configured: no
    // manifests are read, so this costs exactly what it always did. An
    // installation that has opted into edition scoping pays for the versions
    // it must read to apply it — the alternative is one HTTP route answering
    // two different questions depending on a query parameter.
    if (!this.edition) return artifacts;
    const visible: Artifact[] = [];
    for (const artifact of artifacts) {
      const versions = await this.repository.listArtifactVersions(artifact.id);
      if (this.visibleVersions(versions).length > 0) visible.push(artifact);
    }
    return visible;
  }

  /**
   * Artifacts with their versions embedded.
   *
   * A consumer that needs the manifest of every artifact — the Marketplace is
   * the first — would otherwise list the artifacts and then fetch versions one
   * coordinate at a time, turning a catalogue page into N+1 round trips over
   * HTTP. The loop is still per-artifact, but in-process against the database
   * rather than across the network; if the registry grows to where that
   * matters, the fix is one join in the repository, not a change here.
   */
  async listArtifactsWithVersions(filter?: {
    kind?: Artifact['kind'];
    namespace?: string;
  }): Promise<(Artifact & { versions: ArtifactVersion[]; publisherTrustLevel: string; externalPublisher: boolean })[]> {
    const artifacts = await this.repository.listArtifacts(filter);
    const withVersions = await Promise.all(
      artifacts.map(async artifact => {
        const publisher = await this.repository.getPublisherByNamespace(artifact.namespace);
        return {
          ...artifact,
          versions: this.visibleVersions(
            await this.repository.listArtifactVersions(artifact.id),
          ),
          // Phase 7 (P7-S3): include publisher trust so the Marketplace can show
          // trust badges and disclaimers without an extra per-artifact round-trip.
          publisherTrustLevel: publisher?.trustLevel ?? 'INTERNAL',
          externalPublisher: publisher?.externalPublisher ?? false,
        };
      }),
    );
    // An artifact with no visible version has nothing to show, so it is not
    // shown. Dropping it here rather than returning an empty `versions` array
    // keeps the Marketplace from rendering a card with no content behind it.
    return withVersions.filter(artifact => artifact.versions.length > 0);
  }

  async getArtifactByCoordinate(
    namespace: string,
    name: string,
  ): Promise<Artifact | undefined> {
    return this.repository.getArtifactByCoordinate(namespace, name);
  }

  async listArtifactVersions(artifactId: string): Promise<ArtifactVersion[]> {
    return this.repository.listArtifactVersions(artifactId);
  }

  /** Resolves a coordinate to its registered version, or nothing. */
  async resolve(
    coordinate: ArtifactCoordinate,
  ): Promise<ArtifactVersion | undefined> {
    const artifact = await this.repository.getArtifactByCoordinate(
      coordinate.namespace,
      coordinate.name,
    );
    if (!artifact) {
      return undefined;
    }
    return this.repository.getArtifactVersion(artifact.id, coordinate.version);
  }

  /** Resolves a `namespace/name@version` string. */
  async resolveRef(ref: string): Promise<ArtifactVersion | undefined> {
    const coordinate = parseArtifactRef(ref);
    return coordinate ? this.resolve(coordinate) : undefined;
  }

  async getArtifact(id: string): Promise<Artifact | undefined> {
    return this.repository.getArtifact(id);
  }

  async getArtifactVersionById(
    id: string,
  ): Promise<ArtifactVersion | undefined> {
    return this.repository.getArtifactVersionById(id);
  }

  // -- lifecycle -----------------------------------------------------------

  /**
   * Hands a draft over for testing.
   *
   * The lifecycle is a ratchet: each step names the one state it may start
   * from, so a version can never reach RELEASED without having passed through
   * review and certification. Callers that ask for an out-of-order step get a
   * ConflictError naming where the version actually is.
   */
  async submitArtifactVersion(
    id: string,
    actor: string,
  ): Promise<ArtifactVersion> {
    const version = await this.requireArtifactVersion(id);
    this.assertLifecycle(version, 'DRAFT', 'submitted');
    await this.assertPublisherMembership(version, actor, 'submit');
    return this.applyTransition(version, 'SUBMIT', actor, { lifecycle: 'TESTING' });
  }

  /**
   * Records that a version under test has been reviewed.
   *
   * Sets `certificationStatus` to TESTED and leaves `lifecycle` at TESTING:
   * the review is evidence, and certifying on the strength of it is a
   * separate, separately-permissioned act.
   */
  async reviewArtifactVersion(
    id: string,
    actor: string,
  ): Promise<ArtifactVersion> {
    const version = await this.requireArtifactVersion(id);
    this.assertLifecycle(version, 'TESTING', 'reviewed');
    await this.assertPublisherMembership(version, actor, 'review');
    await this.assertSegregation(version, actor, 'REVIEW');
    return this.applyTransition(version, 'REVIEW', actor, { certificationStatus: 'TESTED' });
  }

  /**
   * Certifies a reviewed version.
   *
   * Requires the review to have happened, so that a CERTIFIED lifecycle is
   * never backed by an uncertified record — the same rule
   * `validateGoldenPathRelease` enforces on releases.
   */
  async certifyArtifactVersion(
    id: string,
    actor: string,
  ): Promise<ArtifactVersion> {
    const version = await this.requireArtifactVersion(id);
    this.assertLifecycle(version, 'TESTING', 'certified');
    if (version.certificationStatus !== 'TESTED') {
      throw new ConflictError(
        `Artifact version ${id} cannot be certified: certification status is ` +
          `${version.certificationStatus ?? 'unset'}, must be TESTED (review it first)`,
      );
    }
    this.assertReleaseBuild(version, 'certified');
    await this.assertPublisherMembership(version, actor, 'certify');
    await this.assertPublisherTrust(version, 'certified');
    await this.assertSegregation(version, actor, 'CERTIFY');
    return this.applyTransition(version, 'CERTIFY', actor, {
      lifecycle: 'CERTIFIED',
      certificationStatus: 'CERTIFIED',
    });
  }

  /** Makes a certified version available to consumers. */
  async publishArtifactVersion(
    id: string,
    actor: string,
  ): Promise<ArtifactVersion> {
    const version = await this.requireArtifactVersion(id);
    this.assertLifecycle(version, 'CERTIFIED', 'published');
    this.assertReleaseBuild(version, 'published');
    await this.assertPublisherMembership(version, actor, 'publish');
    await this.assertPublisherTrust(version, 'published');
    const releaseGate = await this.assertProductReleased(version);
    return this.applyTransition(version, 'PUBLISH', actor, { lifecycle: 'RELEASED' }, {
      releaseGate,
    });
  }

  /** Withdraws a released version from recommended use. */
  async deprecateArtifactVersion(
    id: string,
    actor: string,
  ): Promise<ArtifactVersion> {
    const version = await this.requireArtifactVersion(id);
    this.assertLifecycle(version, 'RELEASED', 'deprecated');
    await this.assertPublisherMembership(version, actor, 'deprecate');
    return this.applyTransition(version, 'DEPRECATE', actor, { lifecycle: 'DEPRECATED' });
  }

  /**
   * Checks that `actor` is a member of the publisher that owns the namespace
   * the artifact lives in.
   *
   * If `publisher.memberGroups` is empty, the check passes — the publisher has
   * not restricted who may act. If it is non-empty, the actor's entity ref must
   * appear in the list. This is the per-namespace scoping that NXD-014 deferred
   * until Phase 7. Phase 7 (P7-S2).
   *
   * Called from **all five** lifecycle transitions since NXD-075. P7-S2 wired
   * it to certify and publish only, and `actor` was optional with an `if
   * (actor)` guard — so `submit`, `review` and `deprecate` reached the service
   * with no actor at all and resolved no namespace. A restriction that holds
   * for the last two acts of a lifecycle and not the first three is not a
   * restriction. `actor` is required now, so a route that forgets it fails to
   * compile rather than silently skipping the check.
   *
   * Note: memberGroups entries are direct entity refs (user or group). A full
   * implementation would resolve group memberships via the Catalog; this
   * inline check covers the common case where specific users or groups are
   * named. The STATUS.md entry on NXD-014 records what a full ResourcePermission
   * implementation would require.
   */
  private async assertPublisherMembership(
    version: ArtifactVersion,
    actor: string,
    action: string,
  ): Promise<void> {
    const artifact = await this.repository.getArtifact(version.artifactId);
    if (!artifact) return; // should not happen — version implies artifact exists
    const publisher = await this.repository.getPublisherByNamespace(artifact.namespace);
    if (!publisher || publisher.memberGroups.length === 0) {
      return; // no restriction declared — any authorised actor may proceed
    }
    if (!publisher.memberGroups.includes(actor)) {
      throw new NotAllowedError(
        `Actor "${actor}" is not a member of publisher "${publisher.namespace}" ` +
          `and cannot ${action} artifacts in that namespace. ` +
          `Publisher members: ${publisher.memberGroups.join(', ')}`,
      );
    }
  }

  /** Every transition of a version, oldest first (NXD-146). */
  async listTransitions(id: string) {
    await this.requireArtifactVersion(id);
    return this.repository.listTransitions(id);
  }

  /**
   * Segregation of duties (NXD-146), as the URS chain and product approvals
   * already require (NXD-057, NXD-072): whoever submitted a version may not
   * review or certify it, and whoever reviewed it may not certify it. So a
   * certified version names at least three people — or two, where the
   * submitter also publishes, which only makes available what someone else
   * certified.
   *
   * The submitter is the actor of the last SUBMIT; a version submitted before
   * transitions were recorded falls back to its creator, who registered it.
   */
  private async assertSegregation(
    version: ArtifactVersion,
    actor: string,
    act: 'REVIEW' | 'CERTIFY',
  ): Promise<void> {
    const transitions = await this.repository.listTransitions(version.id);
    const lastBy = (a: ArtifactTransitionAct) =>
      [...transitions].reverse().find(t => t.act === a)?.actor;
    const submitter = lastBy('SUBMIT') ?? version.createdBy;
    const verb = act === 'REVIEW' ? 'review' : 'certify';
    if (actor === submitter) {
      throw new NotAllowedError(
        `${actor} submitted artifact version ${version.id} and cannot ${verb} it: ` +
          'segregation of duties requires another person.',
      );
    }
    if (act === 'CERTIFY') {
      const reviewer = lastBy('REVIEW');
      if (reviewer && actor === reviewer) {
        throw new NotAllowedError(
          `${actor} reviewed artifact version ${version.id} and cannot certify it: ` +
            'segregation of duties requires another person.',
        );
      }
    }
  }

  /**
   * A COMMUNITY publisher's versions may be submitted and reviewed, but not
   * certified or published until a platform administrator promotes the
   * publisher to PARTNER — what self-registration has always said, and what
   * nothing enforced until NXD-146.
   */
  private async assertPublisherTrust(version: ArtifactVersion, verb: string): Promise<void> {
    const artifact = await this.repository.getArtifact(version.artifactId);
    const publisher = artifact ? await this.repository.getPublisher(artifact.publisherId) : undefined;
    if (publisher?.trustLevel === 'COMMUNITY') {
      throw new NotAllowedError(
        `Artifact version ${version.id} cannot be ${verb}: its publisher ` +
          `"${publisher.namespace}" is COMMUNITY. A platform administrator must ` +
          'promote it to PARTNER first.',
      );
    }
  }

  /**
   * The Nexora release gate at publish (NXD-146). A version of an artifact
   * some Composer product governs is published only when a product version
   * registered as exactly this coordinate is RELEASED — whatever the
   * product's GxP relevance (the user's decision of 2026-10-08). An artifact
   * no product governs (a community or listing artifact) has no product
   * release to wait for; its publisher's trust and the certification decide.
   * If the Composer cannot answer, nothing is published.
   */
  private async assertProductReleased(
    version: ArtifactVersion,
  ): Promise<Record<string, unknown>> {
    const artifact = await this.repository.getArtifact(version.artifactId);
    if (!artifact) throw new NotFoundError(`Artifact ${version.artifactId} not found`);
    const coordinate = { namespace: artifact.namespace, name: artifact.name, version: version.version };
    const ref = formatArtifactRef(coordinate);
    if (!this.readReleaseStatus) {
      throw new ServiceUnavailableError(
        `${ref} cannot be published: the Nexora release gate cannot be asked on this instance`,
      );
    }
    let status: ArtifactReleaseStatus;
    try {
      status = await this.readReleaseStatus(coordinate);
    } catch (error) {
      throw new ServiceUnavailableError(
        `${ref} cannot be published: the Nexora release gate did not answer ` +
          `(${error instanceof Error ? error.message : String(error)})`,
      );
    }
    if (status.governed && !status.released) {
      const versions = status.productVersions.length
        ? status.productVersions
            .map(v => `${v.productName} ${v.version} is ${v.status}`)
            .join('; ')
        : 'no product version is registered as this version';
      throw new ConflictError(
        `${ref} cannot be published: a Composer product governs it, and its release ` +
          `in Nexora has not happened (${versions}). Release the product version first.`,
      );
    }
    return {
      governed: status.governed,
      releasedProductVersions: status.productVersions
        .filter(v => v.status === 'RELEASED')
        .map(v => v.id),
    };
  }

  private async requireArtifactVersion(id: string): Promise<ArtifactVersion> {
    const version = await this.repository.getArtifactVersionById(id);
    if (!version) {
      throw new NotFoundError(`Artifact version ${id} not found`);
    }
    return version;
  }

  /**
   * R8 (NXD-137): a version that declares how it runs must say which image it
   * is before it is certified or published. Otherwise certification would
   * vouch for a description, and an installation would have nothing exact to
   * pull. Publish checks again, because a version certified before this rule
   * existed must not slip through on an old certification.
   */
  private assertReleaseBuild(version: ArtifactVersion, verb: string): void {
    if (isRunnableArtifactVersion(version) && !version.releaseBuild) {
      throw new ConflictError(
        `Artifact version ${version.id} cannot be ${verb}: it declares ` +
          'spec.runtime but has no recorded release build (image digest). ' +
          'Register it from a release, through Import release provenance.',
      );
    }
  }

  private assertLifecycle(
    version: ArtifactVersion,
    required: ArtifactLifecycle,
    verb: string,
  ): void {
    if (version.lifecycle !== required) {
      throw new ConflictError(
        `Artifact version ${version.id} cannot be ${verb}: lifecycle is ` +
          `${version.lifecycle}, must be ${required}`,
      );
    }
  }

  private async applyTransition(
    version: ArtifactVersion,
    act: ArtifactTransitionAct,
    actor: string,
    patch: {
      lifecycle?: ArtifactLifecycle;
      certificationStatus?: ArtifactCertificationStatus;
    },
    details: Record<string, unknown> = {},
  ): Promise<ArtifactVersion> {
    // The precondition was checked against a row read a moment ago. Guarding
    // the write on that row's revision is what makes the check binding: a
    // concurrent transition bumps the revision, this update matches nothing,
    // and the loser is told to re-read rather than silently overwriting.
    // The transition record goes in the same transaction (NXD-146).
    const applied = await this.repository.updateArtifactVersion(
      version.id,
      patch,
      version.revision,
      {
        id: randomUUID(),
        artifactVersionId: version.id,
        act,
        fromLifecycle: version.lifecycle,
        toLifecycle: patch.lifecycle ?? version.lifecycle,
        ...(version.certificationStatus
          ? { fromCertificationStatus: version.certificationStatus }
          : {}),
        ...((patch.certificationStatus ?? version.certificationStatus)
          ? { toCertificationStatus: patch.certificationStatus ?? version.certificationStatus }
          : {}),
        actor,
        occurredAt: new Date(),
        details,
      },
    );
    if (!applied) {
      throw new ConflictError(
        `Artifact version ${version.id} changed while it was being updated; ` +
          `re-read it and retry`,
      );
    }
    return { ...version, ...patch, revision: version.revision + 1 };
  }
}
