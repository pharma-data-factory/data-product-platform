/**
 * Persistence for the Artifact Registry.
 *
 * Row mapping only — every rule lives in the service, so the same invariants
 * hold whatever calls it.
 */

import type { Knex } from 'knex';
import type {
  Artifact,
  ArtifactCertificationStatus,
  ArtifactKind,
  ArtifactLifecycle,
  ArtifactManifest,
  ArtifactVersion,
  ArtifactVersionTransition,
  Publisher,
} from '@internal/platform-common';
import type { DistributionChannel } from '@internal/platform-common';
import { up } from './db/migrations';

/** Columns are TEXT; JSON is stored as a string and parsed on read. */
function toJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function fromJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string' || value === '') {
    return fallback;
  }
  try {
    const parsed = JSON.parse(value);
    return parsed === null ? fallback : (parsed as T);
  } catch {
    return fallback;
  }
}

function toDate(value: unknown): Date {
  return value instanceof Date ? value : new Date(String(value));
}

function toOptionalDate(value: unknown): Date | undefined {
  return value === null || value === undefined ? undefined : toDate(value);
}

export class ArtifactRegistryRepository {
  private constructor(private readonly db: Knex) {}

  static async create(database: {
    getClient(): Promise<Knex> | Knex;
  }): Promise<ArtifactRegistryRepository> {
    const db = await database.getClient();
    await up(db);
    return new ArtifactRegistryRepository(db);
  }

  // -- publishers ----------------------------------------------------------

  async createPublisher(publisher: Publisher): Promise<Publisher> {
    await this.db('publishers').insert({
      id: publisher.id,
      namespace: publisher.namespace,
      display_name: publisher.displayName,
      description: publisher.description ?? null,
      member_groups: toJson(publisher.memberGroups),
      trust_level: publisher.trustLevel,
      external_publisher: publisher.externalPublisher ? 1 : 0,
      created_by: publisher.createdBy,
      created_at: publisher.createdAt,
      revision: publisher.revision,
    });
    return publisher;
  }

  async getPublisher(id: string): Promise<Publisher | undefined> {
    const row = await this.db('publishers').where({ id }).first();
    return row ? this.toPublisher(row) : undefined;
  }

  async getPublisherByNamespace(
    namespace: string,
  ): Promise<Publisher | undefined> {
    const row = await this.db('publishers')
      .whereRaw('lower(namespace) = ?', [namespace.toLowerCase()])
      .first();
    return row ? this.toPublisher(row) : undefined;
  }

  async listPublishers(): Promise<Publisher[]> {
    const rows = await this.db('publishers').orderBy('namespace', 'asc');
    return rows.map((row: any) => this.toPublisher(row));
  }

  /** 7-R3: Update publisher trust level and optional member groups. */
  async updatePublisher(
    id: string,
    updates: { trustLevel?: Publisher['trustLevel']; memberGroups?: string[] },
  ): Promise<Publisher | undefined> {
    const patch: Record<string, unknown> = {};
    if (updates.trustLevel !== undefined) patch.trust_level = updates.trustLevel;
    if (updates.memberGroups !== undefined) patch.member_groups = JSON.stringify(updates.memberGroups);
    if (Object.keys(patch).length === 0) return this.getPublisher(id);
    await this.db('publishers').where({ id }).update(patch);
    return this.getPublisher(id);
  }

  // -- artifacts -----------------------------------------------------------

  async createArtifact(artifact: Artifact): Promise<Artifact> {
    await this.db('artifacts').insert({
      id: artifact.id,
      namespace: artifact.namespace,
      name: artifact.name,
      kind: artifact.kind,
      display_name: artifact.displayName,
      description: artifact.description ?? null,
      publisher_id: artifact.publisherId,
      tags: toJson(artifact.tags ?? []),
      created_by: artifact.createdBy,
      created_at: artifact.createdAt,
      revision: artifact.revision,
    });
    return artifact;
  }

  async getArtifact(id: string): Promise<Artifact | undefined> {
    const row = await this.db('artifacts').where({ id }).first();
    return row ? this.toArtifact(row) : undefined;
  }

  async getArtifactByCoordinate(
    namespace: string,
    name: string,
  ): Promise<Artifact | undefined> {
    const row = await this.db('artifacts')
      .whereRaw('lower(namespace) = ?', [namespace.toLowerCase()])
      .andWhereRaw('lower(name) = ?', [name.toLowerCase()])
      .first();
    return row ? this.toArtifact(row) : undefined;
  }

  async listArtifacts(filter?: {
    kind?: ArtifactKind;
    namespace?: string;
  }): Promise<Artifact[]> {
    let query = this.db('artifacts');
    if (filter?.kind) {
      query = query.where({ kind: filter.kind });
    }
    if (filter?.namespace) {
      query = query.whereRaw('lower(namespace) = ?', [
        filter.namespace.toLowerCase(),
      ]);
    }
    const rows = await query.orderBy(['namespace', 'name']);
    return rows.map((row: any) => this.toArtifact(row));
  }

  // -- versions ------------------------------------------------------------

  async createArtifactVersion(
    version: ArtifactVersion,
  ): Promise<ArtifactVersion> {
    await this.db('artifact_versions').insert({
      id: version.id,
      artifact_id: version.artifactId,
      version: version.version,
      lifecycle: version.lifecycle,
      certification_status: version.certificationStatus ?? null,
      source_ref: version.sourceRef ?? null,
      manifest: version.manifest ? toJson(version.manifest) : null,
      distribution: version.distribution ? toJson(version.distribution) : null,
      dependencies: toJson(version.dependencies ?? []),
      release_notes: version.releaseNotes ?? null,
      release_image_repository: version.releaseBuild?.imageRepository ?? null,
      release_image_digest: version.releaseBuild?.imageDigest ?? null,
      release_commit_sha: version.releaseBuild?.commitSha ?? null,
      release_url: version.releaseBuild?.releaseUrl ?? null,
      created_by: version.createdBy,
      created_at: version.createdAt,
      revision: version.revision,
    });
    return version;
  }

  async listArtifactVersions(artifactId: string): Promise<ArtifactVersion[]> {
    const rows = await this.db('artifact_versions')
      .where({ artifact_id: artifactId })
      .orderBy('created_at', 'asc');
    return rows.map((row: any) => this.toArtifactVersion(row));
  }

  async getArtifactVersion(
    artifactId: string,
    version: string,
  ): Promise<ArtifactVersion | undefined> {
    const row = await this.db('artifact_versions')
      .where({ artifact_id: artifactId, version })
      .first();
    return row ? this.toArtifactVersion(row) : undefined;
  }

  async getArtifactVersionById(
    id: string,
  ): Promise<ArtifactVersion | undefined> {
    const row = await this.db('artifact_versions').where({ id }).first();
    return row ? this.toArtifactVersion(row) : undefined;
  }

  /**
   * Moves a version along its lifecycle and/or certification axis.
   *
   * Both columns are written in one statement because certifying advances the
   * lifecycle *and* records the certification in the same act; splitting it
   * would leave a moment where the row claims CERTIFIED lifecycle without the
   * certification that justifies it.
   *
   * The write is guarded on `expectedRevision` — the optimistic-concurrency
   * pattern the URS repository already uses — because the service reads the
   * version, checks the precondition and writes in three separate statements.
   * Without the guard two callers can both read CERTIFIED and both proceed.
   * Returns false when the row moved underneath the caller.
   */
  /**
   * Moves a version and records the transition, in one transaction (NXD-146):
   * there is no lifecycle state a version reached without a record of who
   * moved it there. Returns false, writing nothing, when the version moved
   * since it was read.
   */
  async updateArtifactVersion(
    id: string,
    patch: {
      lifecycle?: ArtifactLifecycle;
      certificationStatus?: ArtifactCertificationStatus;
    },
    expectedRevision: number,
    transition: ArtifactVersionTransition,
  ): Promise<boolean> {
    const update: Record<string, unknown> = { revision: expectedRevision + 1 };
    if (patch.lifecycle !== undefined) {
      update.lifecycle = patch.lifecycle;
    }
    if (patch.certificationStatus !== undefined) {
      update.certification_status = patch.certificationStatus;
    }
    return this.db.transaction(async trx => {
      const updated = await trx('artifact_versions')
        .where({ id, revision: expectedRevision })
        .update(update);
      if (updated === 0) return false;
      await trx('artifact_version_transitions').insert({
        id: transition.id,
        artifact_version_id: transition.artifactVersionId,
        act: transition.act,
        from_lifecycle: transition.fromLifecycle,
        to_lifecycle: transition.toLifecycle,
        from_certification_status: transition.fromCertificationStatus ?? null,
        to_certification_status: transition.toCertificationStatus ?? null,
        actor: transition.actor,
        occurred_at: transition.occurredAt,
        details: JSON.stringify(transition.details),
      });
      return true;
    });
  }

  async listTransitions(artifactVersionId: string): Promise<ArtifactVersionTransition[]> {
    const rows = await this.db('artifact_version_transitions')
      .where({ artifact_version_id: artifactVersionId })
      .orderBy('occurred_at', 'asc');
    return rows.map((row: any) => ({
      id: row.id,
      artifactVersionId: row.artifact_version_id,
      act: row.act,
      fromLifecycle: row.from_lifecycle,
      toLifecycle: row.to_lifecycle,
      fromCertificationStatus: row.from_certification_status ?? undefined,
      toCertificationStatus: row.to_certification_status ?? undefined,
      actor: row.actor,
      occurredAt: typeof row.occurred_at === 'number' ? new Date(row.occurred_at) : toDate(row.occurred_at),
      details: fromJson<Record<string, unknown>>(row.details, {}),
    }));
  }

  // -- mapping -------------------------------------------------------------

  private toPublisher(row: any): Publisher {
    return {
      id: row.id,
      namespace: row.namespace,
      displayName: row.display_name,
      description: row.description ?? undefined,
      memberGroups: fromJson<string[]>(row.member_groups, []),
      // Phase 7 (P7-S1): trust level and external flag. Default to INTERNAL/false
      // for rows created before Phase 7 (NULL in the DB → Nexora-operated).
      trustLevel: (row.trust_level as Publisher['trustLevel']) ?? 'INTERNAL',
      externalPublisher: Boolean(row.external_publisher),
      createdBy: row.created_by,
      createdAt: toDate(row.created_at),
      updatedBy: row.updated_by ?? undefined,
      updatedAt: toOptionalDate(row.updated_at),
      revision: row.revision,
    };
  }

  private toArtifact(row: any): Artifact {
    return {
      id: row.id,
      namespace: row.namespace,
      name: row.name,
      kind: row.kind as ArtifactKind,
      displayName: row.display_name,
      description: row.description ?? undefined,
      publisherId: row.publisher_id,
      tags: fromJson<string[]>(row.tags, []),
      createdBy: row.created_by,
      createdAt: toDate(row.created_at),
      updatedBy: row.updated_by ?? undefined,
      updatedAt: toOptionalDate(row.updated_at),
      revision: row.revision,
    };
  }

  private toArtifactVersion(row: any): ArtifactVersion {
    return {
      id: row.id,
      artifactId: row.artifact_id,
      version: row.version,
      lifecycle: row.lifecycle as ArtifactLifecycle,
      certificationStatus: row.certification_status ?? undefined,
      sourceRef: row.source_ref ?? undefined,
      manifest: fromJson<ArtifactManifest | undefined>(row.manifest, undefined),
      distribution: fromJson<DistributionChannel[] | undefined>(
        row.distribution,
        undefined,
      ),
      dependencies: fromJson<string[]>(row.dependencies, []),
      releaseNotes: row.release_notes ?? undefined,
      ...(row.release_image_digest
        ? {
            releaseBuild: {
              imageRepository: row.release_image_repository,
              imageDigest: row.release_image_digest,
              commitSha: row.release_commit_sha,
              ...(row.release_url ? { releaseUrl: row.release_url } : {}),
            },
          }
        : {}),
      createdBy: row.created_by,
      createdAt: toDate(row.created_at),
      revision: row.revision,
    };
  }
}
