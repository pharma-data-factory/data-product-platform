/**
 * Persistence for installations (NXD-139).
 *
 * Row mapping, plus one rule the database has to keep rather than the
 * service: an act is written as a whole or not at all. The change of desired
 * state, the act record, the audit event and the IQ record go in one
 * transaction, so — unlike NXD-128's product signatures, which are written
 * after the change — there is no state an act changed without a record of it.
 */

import type { Knex } from 'knex';
import type {
  ArtifactInstallation,
  GmpClassificationSource,
  InstallationAct,
  InstallationActRecord,
  InstallationConfig,
  InstallationDesiredState,
  InstallationObservedState,
  InstallationQualification,
  InstallationQualificationStatus,
  RuntimeTarget,
} from '@internal/platform-common';
import { up } from './db/migrations';

export interface InstallationAuditEvent {
  id: string;
  eventType: string;
  installationId?: string;
  targetId?: string;
  actor: string;
  occurredAt: Date;
  details: Record<string, unknown>;
}

/** Everything one act writes. */
export interface ActWrite {
  installation: ArtifactInstallation;
  /** Absent for a new installation; otherwise the revision read. */
  expectedRevision?: number;
  act: InstallationActRecord;
  audit: InstallationAuditEvent;
  qualification?: InstallationQualification;
}

/** PostgreSQL returns a Date; SQLite (the unit suites) epoch milliseconds. */
function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  const text = String(value);
  return /^\d+$/.test(text) ? new Date(Number(text)) : new Date(text);
}

function toOptionalDate(value: unknown): Date | undefined {
  return value === null || value === undefined ? undefined : toDate(value);
}

function fromJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string' || value === '') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export class InstallationsRepository {
  private constructor(private readonly db: Knex) {}

  static async create(database: {
    getClient(): Promise<Knex> | Knex;
  }): Promise<InstallationsRepository> {
    const db = await database.getClient();
    await up(db);
    return new InstallationsRepository(db);
  }

  // -- targets -------------------------------------------------------------

  async createTarget(
    target: RuntimeTarget,
    audit: InstallationAuditEvent,
  ): Promise<RuntimeTarget> {
    await this.db.transaction(async trx => {
      await trx('runtime_targets').insert({
        id: target.id,
        name: target.name,
        display_name: target.displayName,
        description: target.description ?? null,
        provider_kind: target.providerKind,
        provider_subject: target.providerSubject ?? null,
        created_by: target.createdBy,
        created_at: target.createdAt,
        revision: target.revision,
      });
      await this.insertAudit(trx, audit);
    });
    return target;
  }

  async getTarget(id: string): Promise<RuntimeTarget | undefined> {
    const row = await this.db('runtime_targets').where({ id }).first();
    return row ? this.toTarget(row) : undefined;
  }

  async getTargetByName(name: string): Promise<RuntimeTarget | undefined> {
    const row = await this.db('runtime_targets')
      .whereRaw('lower(name) = ?', [name.toLowerCase()])
      .first();
    return row ? this.toTarget(row) : undefined;
  }

  async listTargets(): Promise<RuntimeTarget[]> {
    const rows = await this.db('runtime_targets').orderBy('name', 'asc');
    return rows.map((row: any) => this.toTarget(row));
  }

  // -- installations -------------------------------------------------------

  async getInstallation(id: string): Promise<ArtifactInstallation | undefined> {
    const row = await this.db('artifact_installations').where({ id }).first();
    return row ? this.toInstallation(row) : undefined;
  }

  async getInstallationByName(
    targetId: string,
    name: string,
  ): Promise<ArtifactInstallation | undefined> {
    const row = await this.db('artifact_installations')
      .where({ target_id: targetId })
      .andWhereRaw('lower(name) = ?', [name.toLowerCase()])
      .first();
    return row ? this.toInstallation(row) : undefined;
  }

  async listInstallations(filter?: {
    targetId?: string;
  }): Promise<ArtifactInstallation[]> {
    let query = this.db('artifact_installations');
    if (filter?.targetId) query = query.where({ target_id: filter.targetId });
    const rows = await query.orderBy(['target_id', 'name']);
    return rows.map((row: any) => this.toInstallation(row));
  }

  /**
   * Writes one act in one transaction. Returns false, writing nothing, when
   * the installation moved since it was read (optimistic concurrency, as in
   * the registry's `updateArtifactVersion`).
   */
  async writeAct(write: ActWrite): Promise<boolean> {
    return this.db.transaction(async trx => {
      const row = this.installationRow(write.installation);
      if (write.expectedRevision === undefined) {
        await trx('artifact_installations').insert(row);
      } else {
        const { id, created_by: _c, created_at: _a, ...patch } = row;
        const updated = await trx('artifact_installations')
          .where({ id, revision: write.expectedRevision })
          .update(patch);
        if (updated === 0) return false;
      }
      await trx('installation_acts').insert(this.actRow(write.act));
      await this.insertAudit(trx, write.audit);
      if (write.qualification) {
        await trx('installation_qualifications').insert(
          this.qualificationRow(write.qualification),
        );
      }
      return true;
    });
  }

  async listActs(installationId: string): Promise<InstallationActRecord[]> {
    const rows = await this.db('installation_acts')
      .where({ installation_id: installationId })
      .orderBy('desired_revision', 'asc');
    return rows.map((row: any) => this.toAct(row));
  }

  async listAuditEvents(filter: {
    installationId?: string;
    targetId?: string;
  }): Promise<InstallationAuditEvent[]> {
    let query = this.db('installation_audit_events');
    if (filter.installationId) {
      query = query.where({ installation_id: filter.installationId });
    }
    if (filter.targetId) query = query.where({ target_id: filter.targetId });
    const rows = await query.orderBy('occurred_at', 'asc');
    return rows.map((row: any) => ({
      id: row.id,
      eventType: row.event_type,
      installationId: row.installation_id ?? undefined,
      targetId: row.target_id ?? undefined,
      actor: row.actor,
      occurredAt: toDate(row.occurred_at),
      details: fromJson<Record<string, unknown>>(row.details, {}),
    }));
  }

  async listQualifications(
    installationId: string,
  ): Promise<InstallationQualification[]> {
    const rows = await this.db('installation_qualifications')
      .where({ installation_id: installationId })
      .orderBy('desired_revision', 'asc');
    return rows.map((row: any) => this.toQualification(row));
  }

  // -- rows ----------------------------------------------------------------

  private async insertAudit(
    trx: Knex.Transaction,
    audit: InstallationAuditEvent,
  ): Promise<void> {
    await trx('installation_audit_events').insert({
      id: audit.id,
      event_type: audit.eventType,
      installation_id: audit.installationId ?? null,
      target_id: audit.targetId ?? null,
      actor: audit.actor,
      occurred_at: audit.occurredAt,
      details: JSON.stringify(audit.details),
    });
  }

  private installationRow(installation: ArtifactInstallation) {
    const { desired, observed } = installation;
    return {
      id: installation.id,
      target_id: installation.targetId,
      name: installation.name,
      artifact_namespace: installation.namespace,
      artifact_name: installation.artifactName,
      desired_state: desired.state,
      desired_artifact_ref: desired.artifactRef,
      desired_version: desired.version,
      desired_artifact_version_id: desired.artifactVersionId,
      desired_image_repository: desired.imageRepository,
      desired_image_digest: desired.imageDigest,
      desired_config: JSON.stringify(desired.config),
      desired_config_hash: desired.configHash,
      desired_revision: desired.revision,
      desired_changed_by: desired.changedBy,
      desired_changed_at: desired.changedAt,
      observed_state: observed?.state ?? null,
      observed_desired_revision: observed?.desiredRevision ?? null,
      observed_image_digest: observed?.imageDigest ?? null,
      observed_config_hash: observed?.configHash ?? null,
      observed_message: observed?.message ?? null,
      observed_reported_by: observed?.reportedBy ?? null,
      observed_reported_at: observed?.reportedAt ?? null,
      gmp_relevant: installation.gmpRelevant,
      gmp_classification_source: installation.gmpClassificationSource,
      qualification_status: installation.qualificationStatus,
      created_by: installation.createdBy,
      created_at: installation.createdAt,
      revision: installation.revision,
    };
  }

  private actRow(act: InstallationActRecord) {
    return {
      id: act.id,
      installation_id: act.installationId,
      act: act.act,
      desired_revision: act.desiredRevision,
      artifact_ref: act.artifactRef,
      image_digest: act.imageDigest,
      config_hash: act.configHash,
      justification: act.justification,
      signed_by: act.signedBy,
      signed_at: act.signedAt,
      gmp_relevant: act.gmpRelevant,
      gmp_classification_source: act.gmpClassificationSource,
      reauth_method: act.reauthMethod ?? null,
    };
  }

  private qualificationRow(q: InstallationQualification) {
    return {
      id: q.id,
      installation_id: q.installationId,
      desired_revision: q.desiredRevision,
      status: q.status,
      expected_image_digest: q.expectedImageDigest,
      expected_config_hash: q.expectedConfigHash,
      expected_target_id: q.expectedTargetId,
      observed_image_digest: q.observedImageDigest ?? null,
      observed_config_hash: q.observedConfigHash ?? null,
      observed_target_id: q.observedTargetId ?? null,
      evidence_recorded_by: q.evidenceRecordedBy ?? null,
      evidence_recorded_at: q.evidenceRecordedAt ?? null,
      qualified_by: q.qualifiedBy ?? null,
      qualified_at: q.qualifiedAt ?? null,
      qualification_act_id: q.qualificationActId ?? null,
      created_at: q.createdAt,
      revision: q.revision,
    };
  }

  private toTarget(row: any): RuntimeTarget {
    return {
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description ?? undefined,
      providerKind: row.provider_kind,
      providerSubject: row.provider_subject ?? undefined,
      createdBy: row.created_by,
      createdAt: toDate(row.created_at),
      revision: row.revision,
    };
  }

  private toInstallation(row: any): ArtifactInstallation {
    return {
      id: row.id,
      targetId: row.target_id,
      name: row.name,
      namespace: row.artifact_namespace,
      artifactName: row.artifact_name,
      desired: {
        state: row.desired_state as InstallationDesiredState,
        artifactRef: row.desired_artifact_ref,
        version: row.desired_version,
        artifactVersionId: row.desired_artifact_version_id,
        imageRepository: row.desired_image_repository,
        imageDigest: row.desired_image_digest,
        config: fromJson<InstallationConfig>(row.desired_config, {}),
        configHash: row.desired_config_hash,
        revision: row.desired_revision,
        changedBy: row.desired_changed_by,
        changedAt: toDate(row.desired_changed_at),
      },
      ...(row.observed_state
        ? {
            observed: {
              state: row.observed_state as InstallationObservedState,
              desiredRevision: row.observed_desired_revision ?? undefined,
              imageDigest: row.observed_image_digest ?? undefined,
              configHash: row.observed_config_hash ?? undefined,
              message: row.observed_message ?? undefined,
              reportedBy: row.observed_reported_by,
              reportedAt: toDate(row.observed_reported_at),
            },
          }
        : {}),
      gmpRelevant: Boolean(row.gmp_relevant),
      gmpClassificationSource:
        row.gmp_classification_source as GmpClassificationSource,
      qualificationStatus:
        row.qualification_status as InstallationQualificationStatus,
      createdBy: row.created_by,
      createdAt: toDate(row.created_at),
      revision: row.revision,
    };
  }

  private toAct(row: any): InstallationActRecord {
    return {
      id: row.id,
      installationId: row.installation_id,
      act: row.act as InstallationAct,
      desiredRevision: row.desired_revision,
      artifactRef: row.artifact_ref,
      imageDigest: row.image_digest,
      configHash: row.config_hash,
      justification: row.justification,
      signedBy: row.signed_by,
      signedAt: row.signed_at,
      gmpRelevant: Boolean(row.gmp_relevant),
      gmpClassificationSource:
        row.gmp_classification_source as GmpClassificationSource,
      ...(row.reauth_method ? { reauthMethod: row.reauth_method } : {}),
    };
  }

  private toQualification(row: any): InstallationQualification {
    return {
      id: row.id,
      installationId: row.installation_id,
      desiredRevision: row.desired_revision,
      status: row.status,
      expectedImageDigest: row.expected_image_digest,
      expectedConfigHash: row.expected_config_hash,
      expectedTargetId: row.expected_target_id,
      observedImageDigest: row.observed_image_digest ?? undefined,
      observedConfigHash: row.observed_config_hash ?? undefined,
      observedTargetId: row.observed_target_id ?? undefined,
      evidenceRecordedBy: row.evidence_recorded_by ?? undefined,
      evidenceRecordedAt: toOptionalDate(row.evidence_recorded_at),
      qualifiedBy: row.qualified_by ?? undefined,
      qualifiedAt: toOptionalDate(row.qualified_at),
      qualificationActId: row.qualification_act_id ?? undefined,
      createdAt: toDate(row.created_at),
      revision: row.revision,
    };
  }
}
