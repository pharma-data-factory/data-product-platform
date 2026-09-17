/**
 * Artifact Registry service — the rules that make a registry a registry.
 *
 * Registering is manifest-driven: a publisher hands over a `nexora.yaml` and
 * the registry decides whether it may become a version. Nothing here knows
 * what SAP, MQTT or OEE are; a new capability is a manifest, not a branch.
 */

import { randomUUID } from 'crypto';
import { ConflictError, InputError, NotFoundError } from '@backstage/errors';
import {
  formatArtifactRef,
  isArtifactSegment,
  parseArtifactRef,
  validateArtifactManifest,
  type Artifact,
  type ArtifactCertificationStatus,
  type ArtifactCoordinate,
  type ArtifactLifecycle,
  type ArtifactManifest,
  type ArtifactVersion,
  type DistributionChannel,
  type Publisher,
} from '@internal/platform-common';
import type { ArtifactRegistryRepository } from './repository';

export interface CreatePublisherRequest {
  namespace: string;
  displayName: string;
  description?: string;
  memberGroups?: string[];
}

export interface RegisterArtifactVersionResult {
  artifact: Artifact;
  version: ArtifactVersion;
  /** True when this registration also created the Artifact itself. */
  artifactCreated: boolean;
}

export class ArtifactRegistryService {
  constructor(private readonly repository: ArtifactRegistryRepository) {}

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

    const publisher: Publisher = {
      id: randomUUID(),
      namespace,
      displayName: request.displayName.trim(),
      description: request.description,
      memberGroups: request.memberGroups ?? [],
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
  ): Promise<RegisterArtifactVersionResult> {
    const issues = validateArtifactManifest(input);
    if (issues.length > 0) {
      throw new InputError(`Invalid artifact manifest: ${issues.join('; ')}`);
    }
    const manifest = input as ArtifactManifest;
    const { namespace, name, version } = manifest.metadata;

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
      distribution: manifest.spec?.distribution as
        | DistributionChannel[]
        | undefined,
      dependencies,
      createdBy: actor,
      createdAt: new Date(),
      revision: 1,
    });

    return { artifact, version: created, artifactCreated };
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
    return this.repository.listArtifacts(filter);
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
  }): Promise<(Artifact & { versions: ArtifactVersion[] })[]> {
    const artifacts = await this.repository.listArtifacts(filter);
    return Promise.all(
      artifacts.map(async artifact => ({
        ...artifact,
        versions: await this.repository.listArtifactVersions(artifact.id),
      })),
    );
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
  async submitArtifactVersion(id: string): Promise<ArtifactVersion> {
    const version = await this.requireArtifactVersion(id);
    this.assertLifecycle(version, 'DRAFT', 'submitted');
    return this.applyTransition(version, { lifecycle: 'TESTING' });
  }

  /**
   * Records that a version under test has been reviewed.
   *
   * Sets `certificationStatus` to TESTED and leaves `lifecycle` at TESTING:
   * the review is evidence, and certifying on the strength of it is a
   * separate, separately-permissioned act.
   */
  async reviewArtifactVersion(id: string): Promise<ArtifactVersion> {
    const version = await this.requireArtifactVersion(id);
    this.assertLifecycle(version, 'TESTING', 'reviewed');
    return this.applyTransition(version, { certificationStatus: 'TESTED' });
  }

  /**
   * Certifies a reviewed version.
   *
   * Requires the review to have happened, so that a CERTIFIED lifecycle is
   * never backed by an uncertified record — the same rule
   * `validateGoldenPathRelease` enforces on releases.
   */
  async certifyArtifactVersion(id: string): Promise<ArtifactVersion> {
    const version = await this.requireArtifactVersion(id);
    this.assertLifecycle(version, 'TESTING', 'certified');
    if (version.certificationStatus !== 'TESTED') {
      throw new ConflictError(
        `Artifact version ${id} cannot be certified: certification status is ` +
          `${version.certificationStatus ?? 'unset'}, must be TESTED (review it first)`,
      );
    }
    return this.applyTransition(version, {
      lifecycle: 'CERTIFIED',
      certificationStatus: 'CERTIFIED',
    });
  }

  /** Makes a certified version available to consumers. */
  async publishArtifactVersion(id: string): Promise<ArtifactVersion> {
    const version = await this.requireArtifactVersion(id);
    this.assertLifecycle(version, 'CERTIFIED', 'published');
    return this.applyTransition(version, { lifecycle: 'RELEASED' });
  }

  /** Withdraws a released version from recommended use. */
  async deprecateArtifactVersion(id: string): Promise<ArtifactVersion> {
    const version = await this.requireArtifactVersion(id);
    this.assertLifecycle(version, 'RELEASED', 'deprecated');
    return this.applyTransition(version, { lifecycle: 'DEPRECATED' });
  }

  private async requireArtifactVersion(id: string): Promise<ArtifactVersion> {
    const version = await this.repository.getArtifactVersionById(id);
    if (!version) {
      throw new NotFoundError(`Artifact version ${id} not found`);
    }
    return version;
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
    patch: {
      lifecycle?: ArtifactLifecycle;
      certificationStatus?: ArtifactCertificationStatus;
    },
  ): Promise<ArtifactVersion> {
    // The precondition was checked against a row read a moment ago. Guarding
    // the write on that row's revision is what makes the check binding: a
    // concurrent transition bumps the revision, this update matches nothing,
    // and the loser is told to re-read rather than silently overwriting.
    const applied = await this.repository.updateArtifactVersion(
      version.id,
      patch,
      version.revision,
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
