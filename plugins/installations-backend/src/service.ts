/**
 * The installations store's rules (NXD-129 slice 1, NXD-139).
 *
 * An installation is governed desired state. Installing, upgrading and
 * removing are the only ways to change it, and each is an act:
 *
 * 1. **Whether the act is allowed** is decided first: the target exists; the
 *    artifact version is RELEASED and has a release build (NXD-137); the
 *    configuration is valid against the manifest's `spec.config`, secrets by
 *    reference only; the installation is in a state the act applies to.
 * 2. **The GMP classification** comes from the Composer product governing the
 *    artifact (`artifactRef`, NXD-137). The registry holds none.
 * 3. **The attestation.** GMP-relevant (INDIRECT, DIRECT, unanswered, or the
 *    Composer unable to answer): a justification and the actor's PIN,
 *    verified in the URS Composer. Otherwise: a confirmation. A refused act
 *    therefore costs no PIN attempt — NXD-128's order.
 * 4. **The write**, in one transaction: desired state, act record, audit
 *    event and, for a GMP install or upgrade, an IQ record awaiting evidence.
 *
 * The service knows nothing of HTTP or credentials. The router binds each
 * request's reads, classification and PIN check to the caller and hands them
 * in as an `ActContext`.
 */

import { randomUUID } from 'crypto';
import {
  ConflictError,
  InputError,
  NotFoundError,
} from '@backstage/errors';
import {
  computeInstallationConfigHash,
  formatArtifactRef,
  isArtifactSegment,
  parseArtifactRef,
  validateInstallationConfig,
  type ArtifactCoordinate,
  type ArtifactInstallation,
  type ArtifactManifest,
  type ArtifactVersion,
  type InstallationAct,
  type InstallationActRecord,
  type InstallationConfig,
  type InstallationQualification,
  type InstallationSignatureInput,
  type RuntimeTarget,
} from '@internal/platform-common';
import type { GmpClassification } from './clients';
import type {
  InstallationAuditEvent,
  InstallationsRepository,
} from './repository';

/** What one request may ask of other plugins, bound to its caller. */
export interface ActContext {
  actor: string;
  readVersion(coordinate: ArtifactCoordinate): Promise<ArtifactVersion | undefined>;
  classify(artifact: { namespace: string; name: string }): Promise<GmpClassification>;
  verifyPin(pin: string): Promise<string>;
}

export interface RegisterTargetRequest {
  name?: string;
  displayName?: string;
  description?: string;
  providerKind?: string;
  providerSubject?: string;
}

export interface InstallRequest {
  targetId?: string;
  /** `namespace/name@version`. */
  artifactRef?: string;
  /** Unique on the target; defaults to the artifact name. */
  name?: string;
  config?: unknown;
  signature?: InstallationSignatureInput;
}

export interface UpgradeRequest {
  /** The version to move to; defaults to the current one (a config change). */
  version?: string;
  /** Replaces the configuration; absent keeps the current one. */
  config?: unknown;
  signature?: InstallationSignatureInput;
}

export interface RemoveRequest {
  signature?: InstallationSignatureInput;
}

/** The meaning stated in a refusal, per act. */
const ACT_VERB: Record<InstallationAct, string> = {
  INSTALL: 'installing',
  UPGRADE: 'upgrading',
  REMOVE: 'removing',
};

const AUDIT_EVENT: Record<InstallationAct, string> = {
  INSTALL: 'INSTALLATION_REQUESTED',
  UPGRADE: 'UPGRADE_REQUESTED',
  REMOVE: 'REMOVAL_REQUESTED',
};

interface Planned {
  coordinate: ArtifactCoordinate;
  version: ArtifactVersion;
  config: InstallationConfig;
  configHash: string;
}

export class InstallationsService {
  constructor(private readonly repository: InstallationsRepository) {}

  // -- targets -------------------------------------------------------------

  async registerTarget(
    request: RegisterTargetRequest,
    actor: string,
  ): Promise<RuntimeTarget> {
    const name = String(request.name ?? '').trim();
    if (!isArtifactSegment(name)) {
      throw new InputError(
        `Invalid target name "${name}": lowercase alphanumeric with single inner hyphens`,
      );
    }
    const providerKind = String(request.providerKind ?? '').trim();
    if (!isArtifactSegment(providerKind)) {
      throw new InputError(
        `Invalid providerKind "${providerKind}": a kebab-case name such as docker-compose`,
      );
    }
    const existing = await this.repository.getTargetByName(name);
    if (existing) {
      throw new ConflictError(`Runtime target "${name}" already exists (${existing.id})`);
    }
    const providerSubject = request.providerSubject?.trim();
    const target: RuntimeTarget = {
      id: randomUUID(),
      name,
      displayName: request.displayName?.trim() || name,
      ...(request.description ? { description: request.description } : {}),
      providerKind,
      ...(providerSubject ? { providerSubject } : {}),
      createdBy: actor,
      createdAt: new Date(),
      revision: 1,
    };
    return this.repository.createTarget(target, {
      id: randomUUID(),
      eventType: 'TARGET_REGISTERED',
      targetId: target.id,
      actor,
      occurredAt: target.createdAt,
      details: { name, providerKind, providerSubject: providerSubject ?? null },
    });
  }

  async listTargets(): Promise<RuntimeTarget[]> {
    return this.repository.listTargets();
  }

  async getTarget(id: string): Promise<RuntimeTarget> {
    const target = await this.repository.getTarget(id);
    if (!target) throw new NotFoundError(`Runtime target ${id} not found`);
    return target;
  }

  // -- reads ---------------------------------------------------------------

  async listInstallations(filter?: { targetId?: string }): Promise<ArtifactInstallation[]> {
    return this.repository.listInstallations(filter);
  }

  async getInstallation(id: string): Promise<ArtifactInstallation> {
    const installation = await this.repository.getInstallation(id);
    if (!installation) throw new NotFoundError(`Installation ${id} not found`);
    return installation;
  }

  async listActs(id: string): Promise<InstallationActRecord[]> {
    await this.getInstallation(id);
    return this.repository.listActs(id);
  }

  async listAuditEvents(id: string): Promise<InstallationAuditEvent[]> {
    await this.getInstallation(id);
    return this.repository.listAuditEvents({ installationId: id });
  }

  async listQualifications(id: string): Promise<InstallationQualification[]> {
    await this.getInstallation(id);
    return this.repository.listQualifications(id);
  }

  // -- acts ----------------------------------------------------------------

  async install(request: InstallRequest, ctx: ActContext): Promise<ArtifactInstallation> {
    const target = await this.getTarget(String(request.targetId ?? ''));
    const coordinate = parseArtifactRef(String(request.artifactRef ?? ''));
    if (!coordinate) {
      throw new InputError(
        `artifactRef must be namespace/name@version, got "${request.artifactRef ?? ''}"`,
      );
    }
    const name = String(request.name ?? coordinate.name).trim();
    if (!isArtifactSegment(name)) {
      throw new InputError(
        `Invalid installation name "${name}": lowercase alphanumeric with single inner hyphens`,
      );
    }
    const clash = await this.repository.getInstallationByName(target.id, name);
    if (clash) {
      throw new ConflictError(
        `Target "${target.name}" already has an installation named "${name}" ` +
          `(${clash.id}, desired ${clash.desired.state}). Upgrade it, or choose another name.`,
      );
    }
    const planned = await this.plan(coordinate, request.config, ctx);

    const classification = await ctx.classify(coordinate);
    const attested = await this.attest('INSTALL', classification, request.signature, ctx);

    const now = new Date();
    const installation: ArtifactInstallation = {
      id: randomUUID(),
      targetId: target.id,
      name,
      namespace: coordinate.namespace,
      artifactName: coordinate.name,
      desired: this.desired(planned, 'PRESENT', 1, ctx.actor, now),
      gmpRelevant: classification.gmpRelevant,
      gmpClassificationSource: classification.source,
      qualificationStatus: classification.gmpRelevant ? 'PENDING_EVIDENCE' : 'NOT_REQUIRED',
      createdBy: ctx.actor,
      createdAt: now,
      revision: 1,
    };
    await this.write('INSTALL', undefined, installation, attested, classification, ctx.actor, now);
    return installation;
  }

  async upgrade(
    id: string,
    request: UpgradeRequest,
    ctx: ActContext,
  ): Promise<ArtifactInstallation> {
    const current = await this.getInstallation(id);
    if (current.desired.state !== 'PRESENT') {
      throw new ConflictError(
        `Installation ${id} cannot be upgraded: it is desired ${current.desired.state}`,
      );
    }
    const coordinate: ArtifactCoordinate = {
      namespace: current.namespace,
      name: current.artifactName,
      version: String(request.version ?? current.desired.version).trim(),
    };
    const planned = await this.plan(
      coordinate,
      request.config === undefined ? current.desired.config : request.config,
      ctx,
    );
    if (
      planned.version.id === current.desired.artifactVersionId &&
      planned.configHash === current.desired.configHash
    ) {
      throw new ConflictError(
        `Installation ${id} already desires ${current.desired.artifactRef} with this ` +
          'configuration; an upgrade must change the version or the configuration',
      );
    }

    const classification = await ctx.classify(coordinate);
    const attested = await this.attest('UPGRADE', classification, request.signature, ctx);

    const now = new Date();
    const next: ArtifactInstallation = {
      ...current,
      desired: this.desired(planned, 'PRESENT', current.desired.revision + 1, ctx.actor, now),
      gmpRelevant: classification.gmpRelevant,
      gmpClassificationSource: classification.source,
      qualificationStatus: classification.gmpRelevant ? 'PENDING_EVIDENCE' : 'NOT_REQUIRED',
      revision: current.revision + 1,
    };
    await this.write('UPGRADE', current, next, attested, classification, ctx.actor, now);
    return next;
  }

  async remove(id: string, request: RemoveRequest, ctx: ActContext): Promise<ArtifactInstallation> {
    const current = await this.getInstallation(id);
    if (current.desired.state !== 'PRESENT') {
      throw new ConflictError(
        `Installation ${id} cannot be removed: it is already desired ${current.desired.state}`,
      );
    }
    const classification = await ctx.classify({
      namespace: current.namespace,
      name: current.artifactName,
    });
    const attested = await this.attest('REMOVE', classification, request.signature, ctx);

    const now = new Date();
    const next: ArtifactInstallation = {
      ...current,
      desired: {
        ...current.desired,
        state: 'ABSENT',
        revision: current.desired.revision + 1,
        changedBy: ctx.actor,
        changedAt: now,
      },
      gmpRelevant: classification.gmpRelevant,
      gmpClassificationSource: classification.source,
      // The qualification of what ran stays as it was; a decommissioning
      // record is not modelled (NXD-139, named).
      revision: current.revision + 1,
    };
    await this.write('REMOVE', current, next, attested, classification, ctx.actor, now);
    return next;
  }

  // -- rules ---------------------------------------------------------------

  /**
   * Only a RELEASED version with a release build may be installed, and its
   * configuration must be valid against its own manifest.
   */
  private async plan(
    coordinate: ArtifactCoordinate,
    configInput: unknown,
    ctx: ActContext,
  ): Promise<Planned> {
    const ref = formatArtifactRef(coordinate);
    const version = await ctx.readVersion(coordinate);
    if (!version) {
      throw new NotFoundError(`Artifact version ${ref} is not in the registry`);
    }
    if (version.lifecycle !== 'RELEASED') {
      throw new ConflictError(
        `${ref} cannot be installed: its lifecycle is ${version.lifecycle}; ` +
          'only a RELEASED version may be installed',
      );
    }
    if (!version.releaseBuild?.imageDigest || !version.releaseBuild.imageRepository) {
      throw new ConflictError(
        `${ref} cannot be installed: it has no recorded release build (image digest). ` +
          'Only a version registered from a release (NXD-137) can be run.',
      );
    }
    const manifest = version.manifest as ArtifactManifest | undefined;
    const { config, issues } = validateInstallationConfig(manifest?.spec?.config, configInput);
    if (issues.length > 0) {
      throw new InputError(`Invalid configuration for ${ref}: ${issues.join('; ')}`);
    }
    return {
      coordinate,
      version,
      config,
      configHash: computeInstallationConfigHash(config),
    };
  }

  /**
   * The justification and second factor of an act. GMP-relevant: both
   * required, then the PIN is verified — after every other check, so a
   * refused act costs no PIN attempt. Otherwise: a confirmation.
   */
  private async attest(
    act: InstallationAct,
    classification: GmpClassification,
    input: InstallationSignatureInput | undefined,
    ctx: ActContext,
  ): Promise<{ justification: string; reauthMethod?: string }> {
    const justification = String(input?.justification ?? '').trim();
    const verb = ACT_VERB[act];
    if (!classification.gmpRelevant) {
      if (input?.confirmed !== true) {
        throw new InputError(
          `Confirm ${verb} this installation: send signature.confirmed = true.`,
        );
      }
      return { justification };
    }
    if (!justification) {
      throw new InputError(
        `This product is GMP-relevant: ${verb} it needs a justification and your signing PIN.`,
      );
    }
    if (!input?.pin) {
      throw new InputError(
        `This product is GMP-relevant: ${verb} it needs your signing PIN.`,
      );
    }
    return { justification, reauthMethod: await ctx.verifyPin(String(input.pin)) };
  }

  private desired(
    planned: Planned,
    state: 'PRESENT',
    revision: number,
    actor: string,
    at: Date,
  ): ArtifactInstallation['desired'] {
    const build = planned.version.releaseBuild!;
    return {
      state,
      artifactRef: formatArtifactRef(planned.coordinate),
      version: planned.coordinate.version,
      artifactVersionId: planned.version.id,
      imageRepository: build.imageRepository,
      imageDigest: build.imageDigest,
      config: planned.config,
      configHash: planned.configHash,
      revision,
      changedBy: actor,
      changedAt: at,
    };
  }

  private async write(
    act: InstallationAct,
    before: ArtifactInstallation | undefined,
    after: ArtifactInstallation,
    attested: { justification: string; reauthMethod?: string },
    classification: GmpClassification,
    actor: string,
    at: Date,
  ): Promise<void> {
    const record: InstallationActRecord = {
      id: randomUUID(),
      installationId: after.id,
      act,
      desiredRevision: after.desired.revision,
      artifactRef: after.desired.artifactRef,
      imageDigest: after.desired.imageDigest,
      configHash: after.desired.configHash,
      justification: attested.justification,
      signedBy: actor,
      signedAt: at.toISOString(),
      gmpRelevant: classification.gmpRelevant,
      gmpClassificationSource: classification.source,
      ...(attested.reauthMethod ? { reauthMethod: attested.reauthMethod } : {}),
    };
    const snapshot = (installation: ArtifactInstallation | undefined) =>
      installation
        ? {
            state: installation.desired.state,
            artifactRef: installation.desired.artifactRef,
            imageDigest: installation.desired.imageDigest,
            config: installation.desired.config,
            configHash: installation.desired.configHash,
            revision: installation.desired.revision,
          }
        : null;
    const qualification: InstallationQualification | undefined =
      act !== 'REMOVE' && classification.gmpRelevant
        ? {
            id: randomUUID(),
            installationId: after.id,
            desiredRevision: after.desired.revision,
            status: 'PENDING_EVIDENCE',
            expectedImageDigest: after.desired.imageDigest,
            expectedConfigHash: after.desired.configHash,
            expectedTargetId: after.targetId,
            createdAt: at,
            revision: 1,
          }
        : undefined;
    const written = await this.repository
      .writeAct({
      installation: after,
      expectedRevision: before?.revision,
      act: record,
      audit: {
        id: randomUUID(),
        eventType: AUDIT_EVENT[act],
        installationId: after.id,
        targetId: after.targetId,
        actor,
        occurredAt: at,
        details: {
          actId: record.id,
          before: snapshot(before),
          after: snapshot(after),
          gmpRelevant: classification.gmpRelevant,
          gmpClassificationSource: classification.source,
        },
      },
      qualification,
      })
      .catch(error => {
        // Two concurrent installs of one name: the database's identity index
        // decides, and the loser is told so rather than handed a 500.
        if (/unique/i.test(String(error))) return false;
        throw error;
      });
    if (!written) {
      throw new ConflictError(
        `Installation ${after.id} changed while it was being updated; re-read it and retry`,
      );
    }
  }
}
