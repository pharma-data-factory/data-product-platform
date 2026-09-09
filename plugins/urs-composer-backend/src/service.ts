/**
 * URS Composer Service
 * Business logic layer for requirement management
 */

import { randomUUID } from 'crypto';
import { LoggerService } from '@backstage/backend-plugin-api';
import {
  ConflictError,
  InputError,
  NotAllowedError,
  NotFoundError,
} from '@backstage/errors';
import type { CatalogService } from '@backstage/plugin-catalog-node';
import type { BackstageCredentials } from '@backstage/backend-plugin-api';
import {
  RequirementSet,
  URSRequirement,
  AuditEvent,
  URSStatus,
  ApprovalRole,
  QualityCheckResult,
  SolutionType,
  GxPRelevance,
  RequirementVersion,
  Baseline,
  ApprovalWorkflow,
  ApprovalInstance,
  ApprovalInstanceStatus,
  ApprovalStepStatus,
  UpdateRequirementSetRequest,
  BusinessCapabilityPersisted,
  BusinessRolePersisted,
  ChangeSet,
  RequirementChange,
  Signature,
  SignatureMeaning,
  SignatureTargetType,
  ChangeRequest,
  ChangeRequestStatus,
  ImpactAssessment,
} from './types';
import { SignaturePinReAuth } from './domain/reauth';
import { computeReviewScopes } from './domain/baseline';
import {
  baselineWorkflow,
  requirementVersionWorkflow,
  WorkflowView,
} from './domain/workflow';
import {
  hashOf,
  SignatureService,
  type SignRequest,
} from './domain/signature-service';
import { IURSRepository } from './repository-interface';
import {
  firstVersion,
  nextDraft,
  parseLabel,
  versionOrdinal,
  type VersionNumber,
} from './domain/versioning';
import type { LLMClient, GeneratedRequirement } from './llm-client';

export interface URSServiceOptions {
  logger: LoggerService;
  repository: IURSRepository;
  llmClient?: LLMClient;
  catalog?: CatalogService;
}

/**
 * Format for a caller-supplied stable requirement set key, e.g. "URS-WD".
 * Generated keys carry a timestamp segment and are not held to this pattern.
 */
const STABLE_REQUIREMENT_SET_KEY = /^URS-[A-Z0-9]{2,12}$/;

/**
 * URS Composer Service
 * Encapsulates business rules and workflows
 */
export class URSService {
  private logger: LoggerService;
  private repository: IURSRepository;
  private llmClient?: LLMClient;
  private catalog?: CatalogService;

  constructor(options: URSServiceOptions) {
    this.logger = options.logger;
    this.repository = options.repository;
    this.llmClient = options.llmClient;
    this.catalog = options.catalog;
  }

  /**
   * Map Backstage groups to URS approval roles.
   * A user can hold multiple approval roles simultaneously.
   *
   * The `urs-*` groups are the canonical mapping per ADR-004 and
   * docs/rbac/platform-roles.md. The `business-capability-leads` and
   * `data-product-owners` entries are retained as aliases so that users who
   * could approve before this mapping was corrected keep their access.
   */
  private static readonly GROUP_TO_APPROVAL_ROLE: Record<string, ApprovalRole> = {
    'platform-admins': ApprovalRole.ADMIN,
    'urs-authors': ApprovalRole.AUTHOR,
    'urs-business-reviewers': ApprovalRole.BUSINESS_REVIEWER,
    'urs-product-managers': ApprovalRole.PRODUCT_MANAGER,
    'urs-quality-reviewers': ApprovalRole.QUALITY_REVIEWER,
    'business-capability-leads': ApprovalRole.BUSINESS_REVIEWER,
    'data-product-owners': ApprovalRole.PRODUCT_MANAGER,
  };

  /**
   * Resolve a user's approval roles from their Backstage group memberships.
   * Throws NotAllowedError if catalog is unavailable (fail-closed).
   */
  async getUserApprovalRoles(actor: string, credentials?: BackstageCredentials): Promise<ApprovalRole[]> {
    if (!this.catalog) {
      throw new NotAllowedError(
        'Catalog service unavailable — cannot verify approval roles. Please retry later.',
      );
    }

    try {
      const entity = await this.catalog.getEntityByRef(actor, { credentials: credentials! });
      if (!entity) {
        this.logger.warn(`User entity not found in catalog: ${actor}`);
        return [];
      }

      const memberOf = (entity.spec as any)?.memberOf as string[] | undefined;
      if (!memberOf || memberOf.length === 0) {
        return [];
      }

      const roles = new Set<ApprovalRole>();
      for (const groupRef of memberOf) {
        const groupName = groupRef.replace(/^group:default\//, '');
        const role = URSService.GROUP_TO_APPROVAL_ROLE[groupName];
        if (role) {
          roles.add(role);
        }
      }

      return Array.from(roles);
    } catch (err) {
      throw new NotAllowedError(
        `Failed to resolve approval roles for ${actor}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Get all business capabilities (persisted, ACTIVE)
   */
  async getCapabilities(): Promise<BusinessCapabilityPersisted[]> {
    const { items } = await this.repository.listBusinessCapabilities(1000, 0);
    return items;
  }

  /**
   * List business capabilities with pagination
   */
  async listCapabilities(
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ items: BusinessCapabilityPersisted[]; total: number }> {
    return this.repository.listBusinessCapabilities(limit, offset);
  }

  /**
   * Get capability by ID
   */
  async getCapability(id: string): Promise<BusinessCapabilityPersisted | null> {
    return this.repository.getBusinessCapability(id);
  }

  /**
   * Validate capability references
   */
  async validateCapabilityRefs(refs: string[]): Promise<boolean> {
    for (const ref of refs) {
      const cap = await this.getCapability(ref);
      if (!cap) {
        this.logger.warn(`Invalid capability reference: ${ref}`);
        return false;
      }
    }
    return true;
  }

  /**
   * Create a business capability (Business Capability Lead). ALCOA-audited.
   */
  async createBusinessCapability(
    data: { name: string; description?: string; domain: string },
    actor: string,
  ): Promise<BusinessCapabilityPersisted> {
    const name = data.name?.trim();
    const domain = data.domain?.trim();
    if (!name || !domain) {
      throw new Error('name and domain are required');
    }
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const id = `business-capability:${domain}/${slug}`;
    const existing = await this.repository.getBusinessCapability(id);
    if (existing) {
      throw new Error(`Business capability ${id} already exists`);
    }
    const now = new Date();
    const cap: BusinessCapabilityPersisted = {
      id,
      name,
      description: data.description?.trim() || '',
      domain,
      source: 'USER',
      status: 'ACTIVE',
      createdAt: now,
      createdBy: actor,
      version: 1,
    };
    const saved = await this.repository.createBusinessCapability(cap);
    await this.repository.createAuditEvent({
      id: this.generateUUID(),
      entityType: 'BUSINESS_CAPABILITY',
      entityId: saved.id,
      eventType: 'CREATED',
      newValue: saved,
      actor,
      timestamp: now,
    });
    return saved;
  }

  /**
   * Update a business capability. ALCOA-audited (old + new value).
   */
  async updateBusinessCapability(
    id: string,
    data: { name?: string; description?: string; domain?: string },
    actor: string,
  ): Promise<BusinessCapabilityPersisted> {
    const existing = await this.repository.getBusinessCapability(id);
    if (!existing) {
      throw new Error(`Business capability ${id} not found`);
    }
    const updated: BusinessCapabilityPersisted = {
      ...existing,
      name: data.name?.trim() || existing.name,
      description:
        data.description !== undefined
          ? data.description.trim()
          : existing.description,
      domain: data.domain?.trim() || existing.domain,
      updatedAt: new Date(),
      updatedBy: actor,
      version: existing.version + 1,
    };
    const saved = await this.repository.updateBusinessCapability(updated);
    await this.repository.createAuditEvent({
      id: this.generateUUID(),
      entityType: 'BUSINESS_CAPABILITY',
      entityId: saved.id,
      eventType: 'UPDATED',
      oldValue: existing,
      newValue: saved,
      actor,
      timestamp: new Date(),
    });
    return saved;
  }

  /**
   * Retire (soft-delete) a business capability. ALCOA-audited, never hard-deleted.
   */
  async retireBusinessCapability(
    id: string,
    actor: string,
  ): Promise<BusinessCapabilityPersisted> {
    const existing = await this.repository.getBusinessCapability(id);
    if (!existing) {
      throw new Error(`Business capability ${id} not found`);
    }
    const retired = await this.repository.retireBusinessCapability(id, actor);
    await this.repository.createAuditEvent({
      id: this.generateUUID(),
      entityType: 'BUSINESS_CAPABILITY',
      entityId: id,
      eventType: 'RETIRED',
      oldValue: existing,
      newValue: retired,
      actor,
      timestamp: new Date(),
    });
    return retired;
  }

  /**
   * Get the append-only audit trail for a business capability.
   */
  async getCapabilityAuditTrail(id: string): Promise<AuditEvent[]> {
    return this.repository.getEntityAuditTrail(id, 'BUSINESS_CAPABILITY');
  }

  // ============================================================================
  // BUSINESS ROLES (P1B)
  // ============================================================================

  async getBusinessRoles(): Promise<BusinessRolePersisted[]> {
    const { items } = await this.repository.listBusinessRoles(1000, 0);
    return items;
  }

  async listBusinessRolesPaginated(
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ items: BusinessRolePersisted[]; total: number }> {
    return this.repository.listBusinessRoles(limit, offset);
  }

  async getBusinessRole(id: string): Promise<BusinessRolePersisted | null> {
    return this.repository.getBusinessRole(id);
  }

  async createBusinessRole(
    data: { name: string; description?: string },
    actor: string,
  ): Promise<BusinessRolePersisted> {
    const name = data.name?.trim();
    if (!name) {
      throw new Error('name is required');
    }
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const id = `role:${slug}`;
    const existing = await this.repository.getBusinessRole(id);
    if (existing) {
      throw new Error(`Business role ${id} already exists`);
    }
    const role: BusinessRolePersisted = {
      id,
      name,
      description: data.description?.trim() || undefined,
      status: 'ACTIVE',
      createdAt: new Date(),
      createdBy: actor,
      version: 1,
    };
    const saved = await this.repository.createBusinessRole(role);
    await this.repository.createAuditEvent({
      id: this.generateUUID(),
      entityType: 'BUSINESS_ROLE',
      entityId: saved.id,
      eventType: 'CREATED',
      newValue: saved,
      actor,
      timestamp: new Date(),
    });
    return saved;
  }

  async updateBusinessRole(
    id: string,
    data: { name?: string; description?: string },
    actor: string,
  ): Promise<BusinessRolePersisted> {
    const existing = await this.repository.getBusinessRole(id);
    if (!existing) {
      throw new Error(`Business role ${id} not found`);
    }
    const updated: BusinessRolePersisted = {
      ...existing,
      name: data.name?.trim() || existing.name,
      description:
        data.description !== undefined
          ? data.description.trim() || undefined
          : existing.description,
      updatedAt: new Date(),
      updatedBy: actor,
      version: existing.version + 1,
    };
    const saved = await this.repository.updateBusinessRole(updated);
    await this.repository.createAuditEvent({
      id: this.generateUUID(),
      entityType: 'BUSINESS_ROLE',
      entityId: id,
      eventType: 'UPDATED',
      oldValue: existing,
      newValue: saved,
      actor,
      timestamp: new Date(),
    });
    return saved;
  }

  async retireBusinessRole(
    id: string,
    actor: string,
  ): Promise<BusinessRolePersisted> {
    const existing = await this.repository.getBusinessRole(id);
    if (!existing) {
      throw new Error(`Business role ${id} not found`);
    }
    const retired = await this.repository.retireBusinessRole(id, actor);
    await this.repository.createAuditEvent({
      id: this.generateUUID(),
      entityType: 'BUSINESS_ROLE',
      entityId: id,
      eventType: 'RETIRED',
      oldValue: existing,
      newValue: retired,
      actor,
      timestamp: new Date(),
    });
    return retired;
  }

  /**
   * Create requirement set
   */
  async createRequirementSet(
    data: Partial<RequirementSet>,
    actor: string,
  ): Promise<RequirementSet> {
    // Validate capabilities
    if (
      !data.businessCapabilityRefs ||
      data.businessCapabilityRefs.length === 0
    ) {
      throw new Error('At least one business capability is required');
    }

    const isValid = await this.validateCapabilityRefs(
      data.businessCapabilityRefs,
    );
    if (!isValid) {
      throw new Error('Invalid business capability reference');
    }

    // Human-readable requirement set ID: honor a caller-supplied stable key,
    // otherwise generate one server-side.
    const requirementSetId = await this.resolveRequirementSetKey(data);

    const now = new Date();
    const requirementSet: RequirementSet = {
      id: this.generateUUID(),
      requirementSetId,
      versionNumber: 1,
      businessCapabilityRefs: data.businessCapabilityRefs!,
      businessNeed: data.businessNeed!,
      desiredOutcome: data.desiredOutcome,
      businessValue: data.businessValue,
      stakeholders: data.stakeholders,
      solutionType: data.solutionType!,
      solutionName: data.solutionName!,
      solutionCatalogRef: data.solutionCatalogRef,
      gxpRelevance: data.gxpRelevance,
      patientImpact: data.patientImpact,
      dataIntegrityImpact: data.dataIntegrityImpact,
      electronicRecords: data.electronicRecords,
      status: URSStatus.DRAFT,
      createdBy: actor,
      createdAt: now,
    };

    const saved = await this.repository.createRequirementSet(requirementSet);

    // Audit
    await this.repository.createAuditEvent({
      id: this.generateUUID(),
      entityType: 'REQUIREMENT_SET',
      entityId: saved.id,
      eventType: 'CREATED',
      newValue: saved,
      actor,
      timestamp: now,
    });

    return saved;
  }

  /**
   * Get requirement set by ID
   */
  async getRequirementSet(id: string): Promise<RequirementSet | null> {
    return this.repository.getRequirementSet(id);
  }

  /**
   * Get all requirement sets (with pagination)
   */
  async listRequirementSets(
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ items: RequirementSet[]; total: number }> {
    return this.repository.listRequirementSets(limit, offset);
  }

  /**
   * Update a draft requirement set and sync requirements.
   */
  async updateRequirementSetDraft(
    requirementSetId: string,
    data: UpdateRequirementSetRequest,
    requirements: Partial<URSRequirement>[],
    actor: string,
  ): Promise<{ requirementSet: RequirementSet; requirements: URSRequirement[] }> {
    const existing = await this.repository.getRequirementSet(requirementSetId);
    if (!existing) {
      throw new Error('Requirement set not found');
    }

    if (existing.status !== URSStatus.DRAFT) {
      throw new Error('Only DRAFT requirement sets can be updated');
    }

    if (data.businessCapabilityRefs) {
      const isValid = await this.validateCapabilityRefs(data.businessCapabilityRefs);
      if (!isValid) {
        throw new Error('Invalid business capability reference');
      }
    }

    const now = new Date();
    const updated: RequirementSet = {
      ...existing,
      businessCapabilityRefs:
        data.businessCapabilityRefs ?? existing.businessCapabilityRefs,
      businessNeed: data.businessNeed ?? existing.businessNeed,
      desiredOutcome: data.desiredOutcome ?? existing.desiredOutcome,
      businessValue: data.businessValue ?? existing.businessValue,
      stakeholders: data.stakeholders ?? existing.stakeholders,
      processContext: data.processContext ?? existing.processContext,
      solutionType: data.solutionType ?? existing.solutionType,
      solutionName: data.solutionName ?? existing.solutionName,
      solutionCatalogRef: data.solutionCatalogRef ?? existing.solutionCatalogRef,
      scope: data.scope ?? existing.scope,
      outOfScope: data.outOfScope ?? existing.outOfScope,
      gxpRelevance: data.gxpRelevance ?? existing.gxpRelevance,
      patientImpact: data.patientImpact ?? existing.patientImpact,
      dataIntegrityImpact: data.dataIntegrityImpact ?? existing.dataIntegrityImpact,
      electronicRecords: data.electronicRecords ?? existing.electronicRecords,
      versionComment: data.versionComment ?? existing.versionComment,
      updatedBy: actor,
      updatedAt: now,
    };

    await this.repository.updateRequirementSet(updated);

    const persistedRequirements: URSRequirement[] = [];
    for (let index = 0; index < requirements.length; index++) {
      const reqData = requirements[index];
      if (!reqData.title || !reqData.statement || !reqData.priority) {
        throw new Error(`Requirement ${index + 1} is missing required fields`);
      }

      const requirementId =
        reqData.requirementId ||
        this.generateRequirementId(existing.requirementSetId, index + 1);

      persistedRequirements.push({
        id: reqData.id || this.generateUUID(),
        requirementSetId,
        requirementId,
        title: reqData.title,
        statement: reqData.statement,
        rationale: reqData.rationale,
        category: reqData.category,
        priority: reqData.priority,
        acceptanceIntent: reqData.acceptanceIntent,
        classification: reqData.classification,
        gxpRelevance: reqData.gxpRelevance,
        source: reqData.source,
        owner: reqData.owner,
        status: URSStatus.DRAFT,
        createdBy: reqData.createdBy || actor,
        createdAt: reqData.createdAt || now,
      });
    }

    const savedRequirements = await this.repository.replaceRequirements(
      requirementSetId,
      persistedRequirements,
    );

    // Wizard persist never called createRequirement; seed 0.1 for any row
    // that still has no version history so baselines and revisions have a start.
    for (const requirement of savedRequirements) {
      await this.seedInitialRequirementVersion(requirement, actor);
    }

    await this.repository.createAuditEvent({
      id: this.generateUUID(),
      entityType: 'REQUIREMENT_SET',
      entityId: requirementSetId,
      eventType: 'UPDATED',
      oldValue: existing,
      newValue: updated,
      actor,
      timestamp: now,
    });

    const refreshed = await this.repository.getRequirementSet(requirementSetId);
    return {
      requirementSet: refreshed || updated,
      requirements: savedRequirements,
    };
  }

  /**
   * Open a controlled revision of an approved/baselined requirement set.
   *
   * The source record stays immutable; a new DRAFT set (versionNumber + 1) is
   * created with cloned requirements and a `supersedesRef` back to the source.
   * Logical requirement IDs are preserved so version history and traceability
   * chain across set versions.
   */
  async reviseRequirementSet(
    id: string,
    actor: string,
    reason?: string,
  ): Promise<RequirementSet> {
    const source = await this.repository.getRequirementSet(id);
    if (!source) {
      throw new NotFoundError('Requirement set not found');
    }

    if (
      source.status === URSStatus.SUPERSEDED ||
      source.status === URSStatus.RETIRED
    ) {
      throw new InputError(`Cannot revise a ${source.status} requirement set`);
    }

    const approvedBaseline = await this.repository.getCurrentApprovedBaseline(
      id,
    );
    const isFrozen =
      source.status === URSStatus.APPROVED ||
      source.status === URSStatus.BASELINED ||
      Boolean(approvedBaseline);
    if (!isFrozen) {
      throw new InputError(
        'Only approved or baselined requirement sets can be revised — edit the draft instead',
      );
    }

    const { items: allSets } = await this.repository.listRequirementSets(
      1000,
      0,
    );
    const openRevision = allSets.find(
      candidate =>
        candidate.supersedesRef === id &&
        (candidate.status === URSStatus.DRAFT ||
          candidate.status === URSStatus.IN_REVIEW),
    );
    if (openRevision) {
      throw new InputError(
        `An open revision already exists: ${openRevision.requirementSetId}`,
      );
    }

    const now = new Date();
    const nextVersionNumber = (source.versionNumber || 1) + 1;
    const draft: RequirementSet = {
      ...source,
      id: this.generateUUID(),
      requirementSetId: `${source.requirementSetId}-V${nextVersionNumber}`,
      versionNumber: nextVersionNumber,
      revision: 1,
      status: URSStatus.DRAFT,
      supersedesRef: source.id,
      versionComment: reason,
      createdBy: actor,
      createdAt: now,
      updatedBy: undefined,
      updatedAt: undefined,
    };
    const saved = await this.repository.createRequirementSet(draft);

    const sourceRequirements = await this.repository.getRequirements(id);
    await this.repository.replaceRequirements(
      saved.id,
      sourceRequirements.map(req => ({
        ...req,
        id: this.generateUUID(),
        requirementSetId: saved.id,
        status: URSStatus.DRAFT,
        createdBy: actor,
        createdAt: now,
      })),
    );

    // Freeze the source record: it stays effective, but is no longer editable
    // while the revision is open.
    if (source.status === URSStatus.DRAFT) {
      await this.repository.updateRequirementSet({
        ...source,
        status: URSStatus.BASELINED,
        updatedBy: actor,
        updatedAt: now,
      });
    }

    await this.repository.createAuditEvent({
      id: this.generateUUID(),
      entityType: 'REQUIREMENT_SET',
      entityId: saved.id,
      entityVersion: `v${saved.versionNumber}`,
      eventType: 'REVISION_CREATED',
      newValue: {
        requirementSetId: saved.requirementSetId,
        versionNumber: saved.versionNumber,
        supersedesRef: source.id,
        clonedRequirements: sourceRequirements.length,
      },
      actor,
      timestamp: now,
      reason,
    });

    await this.repository.createAuditEvent({
      id: this.generateUUID(),
      entityType: 'REQUIREMENT_SET',
      entityId: source.id,
      entityVersion: `v${source.versionNumber}`,
      eventType: 'REVISION_OPENED',
      newValue: { revisionSetId: saved.id },
      actor,
      timestamp: now,
      reason,
    });

    return saved;
  }

  /**
   * Create requirement in a requirement set
   */
  async createRequirement(
    requirementSetId: string,
    data: Partial<URSRequirement>,
    actor: string,
  ): Promise<URSRequirement> {
    const requirementSet = await this.repository.getRequirementSet(
      requirementSetId,
    );
    if (!requirementSet) {
      throw new Error('Requirement set not found');
    }

    if (requirementSet.status !== URSStatus.DRAFT) {
      throw new Error('Can only add requirements to DRAFT requirement sets');
    }

    // Generate requirement ID (URS-WD-001, etc.)
    const count = await this.repository.getRequirementCount(requirementSetId);
    const requirementId = this.generateRequirementId(
      requirementSet.requirementSetId,
      count + 1,
    );

    const now = new Date();
    const requirement: URSRequirement = {
      id: this.generateUUID(),
      requirementSetId,
      requirementId,
      title: data.title!,
      statement: data.statement!,
      rationale: data.rationale,
      priority: data.priority!,
      acceptanceIntent: data.acceptanceIntent,
      classification: data.classification,
      gxpRelevance: data.gxpRelevance,
      source: data.source,
      owner: data.owner,
      status: URSStatus.DRAFT,
      createdBy: actor,
      createdAt: now,
    };

    const saved = await this.repository.createRequirement(requirement);

    await this.repository.createAuditEvent({
      id: this.generateUUID(),
      entityType: 'REQUIREMENT',
      entityId: saved.id,
      eventType: 'CREATED',
      newValue: saved,
      actor,
      timestamp: now,
    });

    // A requirement without a version cannot be baselined, signed or revised.
    // createRevision requires a predecessor; this is the only genesis path.
    await this.seedInitialRequirementVersion(saved, actor);

    return saved;
  }

  /**
   * Open version 0.1 for a brand-new requirement.
   *
   * Idempotent: if any version already exists for the logical requirement id,
   * this is a no-op. Used by createRequirement and by the wizard draft replace
   * path, which can introduce requirements that never went through create.
   */
  private async seedInitialRequirementVersion(
    requirement: URSRequirement,
    actor: string,
  ): Promise<RequirementVersion | undefined> {
    const existing = await this.repository.getRequirementVersions(
      requirement.requirementId,
    );
    if (existing.length > 0) {
      return undefined;
    }

    const first = firstVersion();
    const now = new Date();
    const version: RequirementVersion = {
      id: this.generateUUID(),
      requirementId: requirement.requirementId,
      version: first.label,
      versionLabel: first.label,
      major: first.major,
      minor: first.minor,
      versionNumber: versionOrdinal(first),
      title: requirement.title,
      statement: requirement.statement,
      rationale: requirement.rationale,
      category: requirement.category,
      priority: requirement.priority,
      acceptanceIntent: requirement.acceptanceIntent,
      classification: requirement.classification,
      gxpRelevance: requirement.gxpRelevance,
      source: requirement.source,
      owner: requirement.owner,
      status: URSStatus.DRAFT,
      createdBy: actor,
      createdAt: now,
      revision: 1,
    };
    version.contentHash = hashOf(version);

    await this.repository.createRequirementVersion(version);

    await this.repository.createAuditEvent({
      id: this.generateUUID(),
      entityType: 'REQUIREMENT_VERSION',
      entityId: version.id,
      entityVersion: version.version,
      eventType: 'CREATED',
      newValue: version,
      actor,
      timestamp: now,
      reason: 'Genesis version 0.1',
    });

    return version;
  }

  /**
   * Get requirements for a requirement set
   */
  async getRequirements(requirementSetId: string): Promise<URSRequirement[]> {
    return this.repository.getRequirements(requirementSetId);
  }

  /**
   * Run quality checks on a requirement
   */
  async checkRequirementQuality(req: {
    requirementId?: string;
    title?: string;
    statement?: string;
    gxpRelevance?: GxPRelevance;
  }): Promise<QualityCheckResult[]> {
    const issues: QualityCheckResult[] = [];

    // Check: title present
    if (!req.title || req.title.trim().length === 0) {
      issues.push({
        requirementId: req.requirementId,
        issue: 'Requirement title is missing',
        severity: 'ERROR',
      });
    }

    // Check: statement present
    if (!req.statement || req.statement.trim().length === 0) {
      issues.push({
        requirementId: req.requirementId,
        issue: 'Requirement statement is missing',
        severity: 'ERROR',
      });
    }

    // Check: statement uses "shall" language
    if (
      req.statement &&
      !req.statement.toLowerCase().includes('shall') &&
      !req.statement.toLowerCase().includes('should') &&
      !req.statement.toLowerCase().includes('must')
    ) {
      issues.push({
        requirementId: req.requirementId,
        issue:
          'Requirement should use normative language (shall, should, must)',
        severity: 'WARNING',
        recommendation:
          'Rewrite as: "The solution shall [action]" or "The solution should [behavior]"',
      });
    }

    // Check: flag implementation language
    // Longer keywords first so "PostgreSQL" matches before substring "SQL".
    const implKeywords = [
      'PostgreSQL',
      'REST API',
      'Kubernetes',
      'javascript',
      'node.js',
      'fastapi',
      'python',
      'Docker',
      'react',
      'JSON',
      'SQL',
    ];
    if (req.statement) {
      for (const keyword of implKeywords) {
        if (
          req.statement.toLowerCase().includes(keyword.toLowerCase()) &&
          req.gxpRelevance === GxPRelevance.DIRECT
        ) {
          issues.push({
            requirementId: req.requirementId,
            issue: `Implementation detail detected: "${keyword}"`,
            severity: 'WARNING',
            recommendation:
              'Business requirements should be implementation-agnostic. Specify only the business need, not the technology.',
          });
          break;
        }
      }
    }

    return issues;
  }

  /**
   * Get audit trail for requirement set
   */
  async getAuditTrail(requirementSetId: string): Promise<AuditEvent[]> {
    return this.repository.getAuditTrail(requirementSetId);
  }

  // PRIVATE HELPERS

  private generateUUID(): string {
    return randomUUID();
  }

  /**
   * Resolve the human-readable requirement set key. A caller-supplied stable
   * key is validated and checked for uniqueness; otherwise a timestamp-based
   * key is generated.
   */
  private async resolveRequirementSetKey(
    data: Partial<RequirementSet>,
  ): Promise<string> {
    const requested = data.requirementSetId?.trim();
    if (!requested) {
      return this.generateRequirementSetId(data.solutionType);
    }

    if (!STABLE_REQUIREMENT_SET_KEY.test(requested)) {
      throw new Error(
        `Invalid requirement set key "${requested}": expected URS-<CODE> with 2-12 uppercase letters or digits (e.g. URS-WD)`,
      );
    }

    const existing = await this.repository.findRequirementSetByKey(requested);
    if (existing) {
      throw new Error(`Requirement set key "${requested}" is already in use`);
    }

    return requested;
  }

  private generateRequirementSetId(solutionType?: SolutionType): string {
    const prefix = this.getSolutionTypePrefix(solutionType);
    const timestamp = Date.now().toString(36).toUpperCase();
    return `${prefix}-${timestamp}`;
  }

  private generateRequirementId(
    requirementSetId: string,
    sequenceNumber: number,
  ): string {
    return `${requirementSetId}-${String(sequenceNumber).padStart(3, '0')}`;
  }

  private getSolutionTypePrefix(solutionType?: SolutionType): string {
    switch (solutionType) {
      case SolutionType.PROJECT:
        return 'URS-PRJ';
      case SolutionType.PLUGIN:
        return 'URS-PLG';
      case SolutionType.COMPONENT:
        return 'URS-CMP';
      case SolutionType.DATA_PRODUCT:
        return 'URS-DP';
      default:
        return 'URS';
    }
  }

  // ============================================================================
  // P1A: REQUIREMENT VERSIONING
  // ============================================================================

  /**
   * Statuses in which a requirement version is still being worked on. A
   * requirement may have only one such version at a time (invariant 15).
   */
  private static readonly OPEN_VERSION_STATUSES: readonly URSStatus[] = [
    URSStatus.DRAFT,
    URSStatus.IN_REVIEW,
    URSStatus.REVIEWED,
    URSStatus.IN_APPROVAL,
  ];

  /**
   * Invariant 8: changing a released requirement needs prior authorisation.
   *
   * Once a requirement has been released, someone is relying on it, so a new
   * version may only be raised under an approved change request. A requirement
   * that has never been released is still being drafted and needs none.
   */
  private async requireApprovedChangeRequest(
    existingVersions: RequirementVersion[],
    requirementId: string,
    changeRequestId?: string,
  ): Promise<void> {
    const hasBeenReleased = existingVersions.some(
      v =>
        v.status === URSStatus.APPROVED ||
        v.status === URSStatus.SUPERSEDED ||
        v.status === URSStatus.OBSOLETE,
    );
    if (!hasBeenReleased) {
      return;
    }

    if (!changeRequestId) {
      throw new ConflictError(
        `Requirement ${requirementId} has a released version, so a new version ` +
          `requires an approved change request. Supply changeRequestId.`,
      );
    }

    const changeRequest = await this.repository.getChangeRequest(
      changeRequestId,
    );
    if (!changeRequest) {
      throw new NotFoundError(`Change request ${changeRequestId} not found`);
    }
    if (changeRequest.status !== ChangeRequestStatus.APPROVED) {
      throw new ConflictError(
        `Change request ${changeRequestId} is ${changeRequest.status}; ` +
          `only an ${ChangeRequestStatus.APPROVED} request authorises a new version.`,
      );
    }
  }

  /**
   * Read a version's number, falling back to its label for rows written before
   * major/minor were stored separately.
   */
  private versionNumberOf(version: RequirementVersion): VersionNumber {
    if (version.major !== undefined && version.minor !== undefined) {
      return { major: version.major, minor: version.minor };
    }
    return parseLabel(version.versionLabel ?? version.version);
  }

  /**
   * Create a revision of an existing requirement version
   */
  async createRevision(
    previousVersionId: string,
    revisionReason: string,
    actor: string,
    changeRequestId?: string,
  ): Promise<RequirementVersion> {
    const previous = await this.repository.getRequirementVersion(previousVersionId);
    if (!previous) {
      throw new NotFoundError(`Requirement version ${previousVersionId} not found`);
    }

    // Checked here as well as by the database index, so that the caller gets a
    // message naming the version that is in the way.
    const siblings = await this.repository.getRequirementVersions(
      previous.requirementId,
    );
    const open = siblings.find(v =>
      URSService.OPEN_VERSION_STATUSES.includes(v.status),
    );
    if (open) {
      throw new ConflictError(
        `Requirement ${previous.requirementId} already has an open version ` +
          `(${open.versionLabel ?? open.version}, ${open.status}). ` +
          `Complete or reject it before starting a new revision.`,
      );
    }

    await this.requireApprovedChangeRequest(
      siblings,
      previous.requirementId,
      changeRequestId,
    );

    const next = nextDraft(
      this.versionNumberOf(previous),
      previous.status === URSStatus.APPROVED,
    );

    const newVersion: RequirementVersion = {
      id: this.generateUUID(),
      requirementId: previous.requirementId,
      version: next.label,
      versionLabel: next.label,
      major: next.major,
      minor: next.minor,
      versionNumber: versionOrdinal(next),
      title: previous.title,
      statement: previous.statement,
      rationale: previous.rationale,
      category: previous.category,
      priority: previous.priority,
      acceptanceIntent: previous.acceptanceIntent,
      classification: previous.classification,
      gxpRelevance: previous.gxpRelevance,
      source: previous.source,
      owner: previous.owner,
      status: URSStatus.DRAFT,
      revisionOf: previous.id,
      revisionReason,
      createdBy: actor,
      createdAt: new Date(),
      changeRequestId,
      revision: 1,
    };
    // Stamped at creation and frozen from IN_REVIEW onward by a database
    // trigger, so every later signature can be checked against it.
    newVersion.contentHash = hashOf(newVersion);

    await this.repository.createRequirementVersion(newVersion);

    // Audit
    await this.repository.createAuditEvent({
      id: this.generateUUID(),
      entityType: 'REQUIREMENT_VERSION',
      entityId: newVersion.id,
      entityVersion: newVersion.version,
      eventType: 'CREATED',
      newValue: newVersion,
      actor,
      timestamp: new Date(),
      reason: `Revision: ${revisionReason}`,
    });

    return newVersion;
  }

  /**
   * Get version history for a requirement
   */
  async getVersionHistory(
    requirementId: string,
  ): Promise<RequirementVersion[]> {
    return this.repository.getRequirementVersions(requirementId, 'desc');
  }

  // ============================================================================
  // WORKFLOW VIEW (invariant 17)
  // ============================================================================

  /**
   * Where a requirement version stands, as a timeline.
   *
   * Derived on request from the version's status, its signatures and its audit
   * trail, so it cannot drift from them.
   */
  async getRequirementVersionWorkflow(
    versionId: string,
  ): Promise<WorkflowView> {
    const version = await this.repository.getRequirementVersion(versionId);
    if (!version) {
      throw new NotFoundError(`Requirement version ${versionId} not found`);
    }

    const [signatures, audit] = await Promise.all([
      this.repository.listSignatures(
        SignatureTargetType.REQUIREMENT_VERSION,
        versionId,
      ),
      this.repository.getEntityAuditTrail(versionId, 'REQUIREMENT_VERSION'),
    ]);

    return requirementVersionWorkflow(version, signatures, audit);
  }

  /**
   * Where a baseline stands, as a timeline.
   *
   * Reads the approval chain rather than signatures, because that is what
   * decides a baseline.
   */
  async getBaselineWorkflow(baselineId: string): Promise<WorkflowView> {
    const baseline = await this.repository.getBaseline(baselineId);
    if (!baseline) {
      throw new NotFoundError(`Baseline ${baselineId} not found`);
    }

    const [instances, audit] = await Promise.all([
      this.repository.listApprovalInstances(baselineId),
      this.repository.getEntityAuditTrail(baselineId, 'BASELINE'),
    ]);

    // The most recent instance is the one in force; earlier ones belong to
    // attempts that were rejected and resubmitted.
    const instance = instances.length
      ? instances
          .slice()
          .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
          .pop()!
      : null;

    return baselineWorkflow(baseline, instance, audit);
  }

  // ============================================================================
  // CHANGE CONTROL
  // ============================================================================

  /**
   * Allocate the next change request identifier for the current year.
   *
   * The sequence restarts each year, which is what makes CR-2026-0001 readable
   * as "the first change of 2026". Two requests raised at the same moment
   * would compute the same number; the primary key rejects the loser and the
   * caller retries, which is cheaper and more obvious than a lock.
   */
  private async nextChangeRequestId(): Promise<string> {
    const year = new Date().getFullYear();
    const highest = await this.repository.getHighestChangeRequestSequence(year);
    return `CR-${year}-${String(highest + 1).padStart(4, '0')}`;
  }

  async createChangeRequest(
    data: {
      title: string;
      description: string;
      reason: string;
      affectedRequirementIds?: string[];
    },
    actor: string,
  ): Promise<ChangeRequest> {
    for (const field of ['title', 'description', 'reason'] as const) {
      if (!data[field]?.trim()) {
        throw new InputError(`${field} is required`);
      }
    }

    const attempts = 3;
    for (let attempt = 1; ; attempt++) {
      const request: ChangeRequest = {
        id: await this.nextChangeRequestId(),
        title: data.title,
        description: data.description,
        reason: data.reason,
        affectedRequirementIds: data.affectedRequirementIds ?? [],
        status: ChangeRequestStatus.DRAFT,
        requestedBy: actor,
        requestedAt: new Date(),
        revision: 1,
      };

      try {
        const created = await this.repository.createChangeRequest(request);

        await this.repository.createAuditEvent({
          id: this.generateUUID(),
          entityType: 'CHANGE_REQUEST',
          entityId: created.id,
          eventType: 'CREATED',
          newValue: {
            title: created.title,
            affectedRequirementIds: created.affectedRequirementIds,
          },
          actor,
          timestamp: created.requestedAt,
          reason: created.reason,
        });

        return created;
      } catch (err) {
        // Another request took the number between the query and the insert.
        if (attempt >= attempts) {
          throw err;
        }
      }
    }
  }

  async getChangeRequest(id: string): Promise<ChangeRequest> {
    const request = await this.repository.getChangeRequest(id);
    if (!request) {
      throw new NotFoundError(`Change request ${id} not found`);
    }
    return request;
  }

  async listChangeRequests(
    limit: number,
    offset: number,
  ): Promise<{ items: ChangeRequest[]; total: number }> {
    return this.repository.listChangeRequests(limit, offset);
  }

  /**
   * Record what the change would affect, moving the request to ASSESSED.
   *
   * The assessor may be the requester: assessing is describing consequences,
   * not deciding. The decision is where the separation applies.
   */
  async assessChangeRequest(
    changeRequestId: string,
    data: {
      summary: string;
      gxpImpact: boolean;
      validationImpact: string;
      affectedVersionIds?: string[];
    },
    actor: string,
  ): Promise<ImpactAssessment> {
    if (!data.summary?.trim()) {
      throw new InputError('summary is required');
    }
    if (!data.validationImpact?.trim()) {
      throw new InputError('validationImpact is required');
    }

    return this.repository.withTransaction(async repo => {
      const request = await repo.getChangeRequest(changeRequestId);
      if (!request) {
        throw new NotFoundError(`Change request ${changeRequestId} not found`);
      }

      const assessment: ImpactAssessment = {
        id: this.generateUUID(),
        changeRequestId,
        summary: data.summary,
        gxpImpact: data.gxpImpact,
        validationImpact: data.validationImpact,
        affectedVersionIds: data.affectedVersionIds ?? [],
        assessedBy: actor,
        assessedAt: new Date(),
      };

      await repo.createImpactAssessment(assessment);
      // Rejected by the transition map if the request was already decided.
      await repo.updateChangeRequest({
        ...request,
        status: ChangeRequestStatus.ASSESSED,
      });

      await repo.createAuditEvent({
        id: this.generateUUID(),
        entityType: 'CHANGE_REQUEST',
        entityId: changeRequestId,
        eventType: 'ASSESSED',
        newValue: {
          gxpImpact: assessment.gxpImpact,
          affectedVersionIds: assessment.affectedVersionIds,
        },
        actor,
        timestamp: assessment.assessedAt,
        reason: assessment.summary,
      });

      return assessment;
    });
  }

  /**
   * Approve a change request with a quality signature.
   *
   * Goes through the same signature service as a requirement approval, so the
   * second factor, the role check and the separation of duties are the same
   * rules rather than a parallel set.
   */
  async approveChangeRequest(
    changeRequestId: string,
    actor: string,
    secret: string,
    comment?: string,
    credentials?: BackstageCredentials,
  ): Promise<ChangeRequest> {
    const signatures = this.signatureService(credentials);

    return this.repository.withTransaction(async repo => {
      await signatures.sign(
        {
          targetType: SignatureTargetType.CHANGE_REQUEST,
          targetId: changeRequestId,
          meaning: SignatureMeaning.APPROVED_QA,
          signedBy: actor,
          secret,
          comment,
        },
        repo,
      );

      const request = await repo.getChangeRequest(changeRequestId);
      const decidedAt = new Date();
      const approved: ChangeRequest = {
        ...request!,
        status: ChangeRequestStatus.APPROVED,
        decidedBy: actor,
        decidedAt,
        decisionReason: comment,
      };
      await repo.updateChangeRequest(approved);

      await repo.createAuditEvent({
        id: this.generateUUID(),
        entityType: 'CHANGE_REQUEST',
        entityId: changeRequestId,
        eventType: 'APPROVED',
        newValue: { decidedBy: actor, decidedAt },
        actor,
        timestamp: decidedAt,
        reason: comment,
      });

      return { ...approved, revision: approved.revision + 1 };
    });
  }

  /**
   * Reject a change request.
   *
   * No signature: refusing to change something leaves the released state as it
   * is, so there is nothing new to attest to. A reason is required.
   */
  async rejectChangeRequest(
    changeRequestId: string,
    reason: string,
    actor: string,
  ): Promise<ChangeRequest> {
    if (!reason?.trim()) {
      throw new InputError('A rejection reason is required');
    }

    return this.repository.withTransaction(async repo => {
      const request = await repo.getChangeRequest(changeRequestId);
      if (!request) {
        throw new NotFoundError(`Change request ${changeRequestId} not found`);
      }

      const decidedAt = new Date();
      const rejected: ChangeRequest = {
        ...request,
        status: ChangeRequestStatus.REJECTED,
        decidedBy: actor,
        decidedAt,
        decisionReason: reason,
      };
      await repo.updateChangeRequest(rejected);

      await repo.createAuditEvent({
        id: this.generateUUID(),
        entityType: 'CHANGE_REQUEST',
        entityId: changeRequestId,
        eventType: 'REJECTED',
        newValue: { decidedBy: actor, decidedAt },
        actor,
        timestamp: decidedAt,
        reason,
      });

      return { ...rejected, revision: rejected.revision + 1 };
    });
  }

  /**
   * What a change request led to.
   *
   * Answers the question an inspector asks: this requirement changed — who
   * authorised it, on what assessment, and what came out of it.
   */
  async getChangeRequestTraceability(changeRequestId: string): Promise<{
    changeRequest: ChangeRequest;
    assessment: ImpactAssessment | null;
    signatures: Signature[];
    resultingVersions: RequirementVersion[];
    auditTrail: AuditEvent[];
  }> {
    const changeRequest = await this.getChangeRequest(changeRequestId);

    const [assessment, signatures, resultingVersions, auditTrail] =
      await Promise.all([
        this.repository.getImpactAssessment(changeRequestId),
        this.repository.listSignatures(
          SignatureTargetType.CHANGE_REQUEST,
          changeRequestId,
        ),
        this.repository.getVersionsByChangeRequest(changeRequestId),
        this.repository.getEntityAuditTrail(changeRequestId, 'CHANGE_REQUEST'),
      ]);

    return {
      changeRequest,
      assessment,
      signatures,
      resultingVersions,
      auditTrail,
    };
  }

  // ============================================================================
  // ELECTRONIC SIGNATURES
  // ============================================================================

  /**
   * Build the signature service for one request.
   *
   * Constructed per call because role resolution needs the caller's
   * credentials for the catalog lookup, and threading those through the domain
   * layer would put an HTTP concern where it does not belong.
   *
   * The re-authentication provider is bound to the base repository on purpose:
   * a failed attempt has to be counted even when the surrounding transaction
   * rolls the signature back.
   */
  private signatureService(
    credentials?: BackstageCredentials,
  ): SignatureService {
    return new SignatureService({
      repository: this.repository,
      reAuth: new SignaturePinReAuth(this.repository),
      resolveRoles: userRef => this.getUserApprovalRoles(userRef, credentials),
    });
  }

  /** Set or replace the caller's own signing PIN. */
  async setSigningPin(actor: string, pin: string): Promise<void> {
    await new SignaturePinReAuth(this.repository).enroll(actor, pin);

    await this.repository.createAuditEvent({
      id: this.generateUUID(),
      entityType: 'SIGNATURE_CREDENTIAL',
      entityId: actor,
      eventType: 'PIN_SET',
      actor,
      timestamp: new Date(),
    });
  }

  async listSignatures(versionId: string): Promise<Signature[]> {
    return this.repository.listSignatures(
      SignatureTargetType.REQUIREMENT_VERSION,
      versionId,
    );
  }

  /**
   * Apply an electronic signature to a requirement version.
   *
   * An APPROVED_QA signature releases the version as part of the same
   * transaction (invariant 6). There is deliberately no endpoint that sets a
   * version to APPROVED directly: release is a consequence of a valid quality
   * signature, never an independent act.
   */
  async signRequirementVersion(
    versionId: string,
    meaning: SignatureMeaning,
    actor: string,
    secret: string,
    comment?: string,
    credentials?: BackstageCredentials,
  ): Promise<Signature> {
    const signatures = this.signatureService(credentials);
    const request: SignRequest = {
      targetType: SignatureTargetType.REQUIREMENT_VERSION,
      targetId: versionId,
      meaning,
      signedBy: actor,
      secret,
      comment,
    };

    return this.repository.withTransaction(async repo => {
      const signature = await signatures.sign(request, repo);

      if (meaning === SignatureMeaning.APPROVED_QA) {
        await this.releaseSignedVersion(repo, versionId, actor);
      }

      return signature;
    });
  }

  /**
   * Release a version that has just received its quality signature.
   *
   * Runs inside the signing transaction, so the signature and the release are
   * either both recorded or neither is.
   */
  private async releaseSignedVersion(
    repo: IURSRepository,
    versionId: string,
    actor: string,
  ): Promise<void> {
    const version = await repo.getRequirementVersion(versionId);
    if (!version) {
      throw new NotFoundError(`Requirement version ${versionId} not found`);
    }

    const releasedAt = new Date();
    await repo.updateRequirementVersion({
      ...version,
      status: URSStatus.APPROVED,
      approvedBy: actor,
      approvedAt: releasedAt,
      releasedAt,
    });

    await repo.createAuditEvent({
      id: this.generateUUID(),
      entityType: 'REQUIREMENT_VERSION',
      entityId: versionId,
      entityVersion: version.versionLabel ?? version.version,
      eventType: 'RELEASED',
      oldValue: { status: version.status },
      newValue: { status: URSStatus.APPROVED, releasedAt },
      actor,
      timestamp: releasedAt,
      reason: 'Quality signature applied',
    });

    // Only one version of a requirement is in force at a time.
    const siblings = await repo.getRequirementVersions(version.requirementId);
    for (const previous of siblings) {
      if (previous.id === versionId || previous.status !== URSStatus.APPROVED) {
        continue;
      }

      await repo.updateRequirementVersion({
        ...previous,
        status: URSStatus.SUPERSEDED,
        supersededBy: versionId,
      });

      await repo.createAuditEvent({
        id: this.generateUUID(),
        entityType: 'REQUIREMENT_VERSION',
        entityId: previous.id,
        entityVersion: previous.versionLabel ?? previous.version,
        eventType: 'SUPERSEDED',
        newValue: { supersededBy: versionId },
        actor,
        timestamp: releasedAt,
      });
    }
  }

  /**
   * Get specific version
   */
  async getVersion(versionId: string): Promise<RequirementVersion | null> {
    return this.repository.getRequirementVersion(versionId);
  }

  /**
   * One version of a requirement, addressed the way a reader thinks of it:
   * the requirement and the version label, not an opaque id.
   */
  async getVersionOfRequirement(
    requirementId: string,
    versionLabel: string,
  ): Promise<RequirementVersion | null> {
    const versions = await this.repository.getRequirementVersions(requirementId);
    return (
      versions.find(
        v => v.versionLabel === versionLabel || v.version === versionLabel,
      ) ?? null
    );
  }

  // ============================================================================
  // P1A: BASELINES
  // ============================================================================

  /**
   * Create a baseline (immutable snapshot of requirement set)
   */
  async createBaseline(
    requirementSetId: string,
    requirementVersionIds: string[],
    baselineVersion: string,
    actor: string,
  ): Promise<Baseline> {
    const pinned = await this.loadPinnedVersions(
      requirementSetId,
      requirementVersionIds,
    );
    const items = computeReviewScopes(
      requirementVersionIds,
      pinned,
      await this.predecessorContents(requirementSetId),
    );

    const baseline: Baseline = {
      id: this.generateUUID(),
      requirementSetId,
      baselineVersion,
      status: URSStatus.DRAFT,
      requirementVersionIds,
      items,
      createdBy: actor,
      createdAt: new Date(),
      revision: 1,
    };

    await this.repository.createBaseline(baseline);

    await this.repository.createAuditEvent({
      id: this.generateUUID(),
      entityType: 'BASELINE',
      entityId: baseline.id,
      entityVersion: baselineVersion,
      eventType: 'CREATED',
      newValue: baseline,
      actor,
      timestamp: new Date(),
    });

    return baseline;
  }

  /**
   * Load the versions a baseline is about to pin, refusing anything that does
   * not exist or belongs to a different requirement set.
   *
   * Baselining a version from another set would produce a snapshot that claims
   * to describe this set but does not.
   */
  private async loadPinnedVersions(
    requirementSetId: string,
    versionIds: string[],
  ): Promise<Map<string, RequirementVersion>> {
    const unique = [...new Set(versionIds)];
    if (unique.length !== versionIds.length) {
      throw new InputError(
        'A baseline cannot pin the same requirement version twice.',
      );
    }
    if (!unique.length) {
      return new Map();
    }

    const found = await this.repository.getRequirementVersionsByIds(unique);
    const byId = new Map(found.map(v => [v.id, v]));

    const missing = unique.filter(id => !byId.has(id));
    if (missing.length) {
      throw new NotFoundError(
        `Requirement version(s) not found: ${missing.join(', ')}`,
      );
    }

    // A version belongs to the set through its requirement.
    const requirements = await this.repository.getRequirements(requirementSetId);
    const ownRequirementIds = new Set(requirements.map(r => r.requirementId));

    const foreign = found.filter(v => !ownRequirementIds.has(v.requirementId));
    if (foreign.length) {
      throw new InputError(
        `Requirement version(s) do not belong to requirement set ${requirementSetId}: ${foreign.map(v => `${v.id} (${v.requirementId})`).join(', ')}`,
      );
    }

    return byId;
  }

  /**
   * The versions pinned by the most recent baseline of a set, or null when
   * this is the first one.
   */
  private async predecessorContents(
    requirementSetId: string,
  ): Promise<RequirementVersion[] | null> {
    const baselines = await this.repository.listBaselines(
      requirementSetId,
      200,
      0,
    );
    if (!baselines.items.length) {
      return null;
    }

    const latest = baselines.items
      .slice()
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .pop()!;

    return this.repository.getRequirementVersionsByIds(
      latest.requirementVersionIds ?? [],
    );
  }

  /**
   * Invariant 9: a released baseline never contains unreleased content.
   *
   * Checked when the baseline is released rather than when it is assembled, so
   * that a draft baseline can still be put together from work in progress.
   */
  private async assertPinnedVersionsReleased(
    repo: IURSRepository,
    baseline: Baseline,
  ): Promise<void> {
    const versionIds = baseline.requirementVersionIds ?? [];
    if (!versionIds.length) {
      return;
    }

    const versions = await repo.getRequirementVersionsByIds(versionIds);
    const unreleased = versions.filter(v => v.status !== URSStatus.APPROVED);

    if (unreleased.length) {
      throw new ConflictError(
        `Baseline ${baseline.baselineVersion} cannot be released: ${unreleased.length} pinned version(s) are not approved — ${unreleased.map(v => `${v.requirementId} ${v.versionLabel ?? v.version} (${v.status})`).join(', ')}`,
      );
    }
  }

  /**
   * Invariant 16: a version pinned by a released baseline cannot be retired.
   *
   * The baseline is the record of what was released; dropping a requirement
   * out from under it would leave that record pointing at nothing.
   */
  async obsoleteRequirementVersion(
    versionId: string,
    reason: string,
    actor: string,
  ): Promise<RequirementVersion> {
    if (!reason?.trim()) {
      throw new InputError('A reason is required to make a version obsolete');
    }

    return this.repository.withTransaction(async repo => {
      const version = await repo.getRequirementVersion(versionId);
      if (!version) {
        throw new NotFoundError(`Requirement version ${versionId} not found`);
      }

      const blocking = (
        await repo.getBaselinesPinningVersion(versionId)
      ).filter(b => b.status === URSStatus.APPROVED);

      if (blocking.length) {
        throw new ConflictError(
          `Requirement version ${versionId} is pinned by released baseline(s) and cannot be made obsolete: ${blocking.map(b => `${b.baselineVersion} (${b.id})`).join(', ')}`,
        );
      }

      // The transition map rejects anything that was not released.
      const obsolete = {
        ...version,
        status: URSStatus.OBSOLETE,
      };
      await repo.updateRequirementVersion(obsolete);

      await repo.createAuditEvent({
        id: this.generateUUID(),
        entityType: 'REQUIREMENT_VERSION',
        entityId: versionId,
        entityVersion: version.versionLabel ?? version.version,
        eventType: 'OBSOLETED',
        oldValue: { status: version.status },
        newValue: { status: URSStatus.OBSOLETE },
        actor,
        timestamp: new Date(),
        reason,
      });

      return obsolete;
    });
  }

  /**
   * Release a baseline.
   *
   * Invariant 9 is enforced here: nothing unreleased may be pinned by a
   * baseline that is going out. Invariant 10 is the ordering — the predecessor
   * is superseded as part of the successor's release, in the same transaction,
   * so there is never a moment with two effective baselines or none.
   */
  private async releaseBaseline(
    repo: IURSRepository,
    baseline: Baseline,
    actor: string,
  ): Promise<void> {
    await this.assertPinnedVersionsReleased(repo, baseline);

    const previous = await repo.getCurrentApprovedBaseline(
      baseline.requirementSetId,
    );

    // The lifecycle runs DRAFT -> IN_REVIEW -> IN_APPROVAL -> APPROVED. The
    // caller has just recorded the final step, which is the point the baseline
    // is under decision rather than under review, so that state is recorded
    // before the approval instead of being skipped over.
    let current = baseline;
    if (current.status === URSStatus.IN_REVIEW) {
      await repo.updateBaseline({
        ...current,
        status: URSStatus.IN_APPROVAL,
      });
      current = (await repo.getBaseline(current.id))!;
    }

    await repo.updateBaseline({
      ...current,
      status: URSStatus.APPROVED,
      approvedBy: actor,
      approvedAt: new Date(),
      revision: current.revision || 1,
    });

    if (previous && previous.id !== baseline.id) {
      await repo.updateBaseline({
        ...previous,
        status: URSStatus.SUPERSEDED,
        supersededBy: baseline.id,
      });

      await repo.createAuditEvent({
        id: this.generateUUID(),
        entityType: 'BASELINE',
        entityId: previous.id,
        entityVersion: previous.baselineVersion,
        eventType: 'SUPERSEDED',
        newValue: {
          status: URSStatus.SUPERSEDED,
          supersededBy: baseline.id,
        },
        actor: 'system',
        timestamp: new Date(),
      });
    }

    await repo.createAuditEvent({
      id: this.generateUUID(),
      entityType: 'BASELINE',
      entityId: baseline.id,
      entityVersion: baseline.baselineVersion,
      eventType: 'APPROVED',
      newValue: { status: URSStatus.APPROVED, approvedBy: actor },
      actor,
      timestamp: new Date(),
    });
  }

  /**
   * Get baseline
   */
  async getBaseline(id: string): Promise<Baseline | null> {
    return this.repository.getBaseline(id);
  }

  /**
   * List baselines for requirement set
   */
  async listBaselines(
    requirementSetId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ items: Baseline[]; total: number }> {
    return this.repository.listBaselines(requirementSetId, limit, offset);
  }

  /**
   * Get current approved baseline
   */
  async getCurrentApprovedBaseline(requirementSetId: string): Promise<Baseline | null> {
    return this.repository.getCurrentApprovedBaseline(requirementSetId);
  }

  async computeChangeSet(baselineId: string, actor: string): Promise<ChangeSet> {
    const baseline = await this.repository.getBaseline(baselineId);
    if (!baseline) {
      throw new Error(`Baseline ${baselineId} not found`);
    }

    // Find previous baseline for the same requirement set
    const allBaselines = await this.repository.listBaselines(
      baseline.requirementSetId,
      200,
      0,
    );
    const sorted = allBaselines.items
      .slice()
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const idx = sorted.findIndex(b => b.id === baseline.id);
    const previousBaseline = idx > 0 ? sorted[idx - 1] : undefined;

    // Load all requirement versions from both baselines
    const currentVersionIds = baseline.requirementVersionIds || [];
    const previousVersionIds = previousBaseline?.requirementVersionIds || [];
    const allIds = [...new Set([...currentVersionIds, ...previousVersionIds])];
    const allVersions = await this.repository.getRequirementVersionsByIds(allIds);

    const currentMap = new Map<string, RequirementVersion>();
    const previousMap = new Map<string, RequirementVersion>();

    for (const v of allVersions) {
      if (currentVersionIds.includes(v.id)) {
        currentMap.set(v.requirementId, v);
      }
      if (previousVersionIds.includes(v.id)) {
        previousMap.set(v.requirementId, v);
      }
    }

    const allReqIds = new Set([...currentMap.keys(), ...previousMap.keys()]);
    const changes: RequirementChange[] = [];

    for (const reqId of allReqIds) {
      const current = currentMap.get(reqId);
      const previous = previousMap.get(reqId);

      if (current && !previous) {
        changes.push({ requirementId: reqId, changeType: 'ADDED', currentVersion: current });
      } else if (!current && previous) {
        changes.push({ requirementId: reqId, changeType: 'REMOVED', previousVersion: previous });
      } else if (current && previous) {
        const changedFields = this.diffRequirementVersions(previous, current);
        if (changedFields.length > 0) {
          changes.push({
            requirementId: reqId,
            changeType: 'MODIFIED',
            previousVersion: previous,
            currentVersion: current,
            changedFields,
          });
        } else {
          changes.push({
            requirementId: reqId,
            changeType: 'UNCHANGED',
            currentVersion: current,
            previousVersion: previous,
          });
        }
      }
    }

    return {
      id: this.generateUUID(),
      baselineId: baseline.id,
      previousBaselineId: previousBaseline?.id,
      baselineVersion: baseline.baselineVersion,
      previousBaselineVersion: previousBaseline?.baselineVersion,
      changes,
      summary: {
        added: changes.filter(c => c.changeType === 'ADDED').length,
        modified: changes.filter(c => c.changeType === 'MODIFIED').length,
        removed: changes.filter(c => c.changeType === 'REMOVED').length,
        unchanged: changes.filter(c => c.changeType === 'UNCHANGED').length,
      },
      computedAt: new Date(),
      computedBy: actor,
    };
  }

  private diffRequirementVersions(a: RequirementVersion, b: RequirementVersion): string[] {
    const fields: Array<{ key: string; getA: () => unknown; getB: () => unknown }> = [
      { key: 'title', getA: () => a.title, getB: () => b.title },
      { key: 'statement', getA: () => a.statement, getB: () => b.statement },
      { key: 'rationale', getA: () => a.rationale, getB: () => b.rationale },
      { key: 'category', getA: () => a.category, getB: () => b.category },
      { key: 'priority', getA: () => a.priority, getB: () => b.priority },
      { key: 'acceptanceIntent', getA: () => a.acceptanceIntent, getB: () => b.acceptanceIntent },
      { key: 'gxpRelevance', getA: () => a.gxpRelevance, getB: () => b.gxpRelevance },
      { key: 'source', getA: () => a.source, getB: () => b.source },
      { key: 'owner', getA: () => a.owner, getB: () => b.owner },
    ];
    const changed: string[] = [];
    for (const f of fields) {
      const va = f.getA();
      const vb = f.getB();
      if (JSON.stringify(va) !== JSON.stringify(vb)) {
        changed.push(f.key);
      }
    }
    return changed;
  }

  /**
   * Approve baseline (makes it immutable and retrieves approval workflow)
   */
  async approveBaseline(
    baselineId: string,
    actor: string,
    workflowId?: string,
  ): Promise<{ baseline: Baseline; workflow: ApprovalWorkflow | null }> {
    let baseline = await this.repository.getBaseline(baselineId);
    if (!baseline) {
      throw new Error('Baseline not found');
    }

    // A baseline is released by completing its approval chain, which is what
    // records who approved what. Releasing it from here would skip that.
    if (baseline.status !== URSStatus.IN_APPROVAL) {
      throw new ConflictError(
        `Baseline ${baselineId} is ${baseline.status}. A baseline is released by ` +
          `completing its approval chain, not directly.`,
      );
    }

    // Releasing the baseline and superseding its predecessor is one act; a
    // failure in between must not leave the set with two effective baselines.
    const toRelease = baseline;
    await this.repository.withTransaction(repo =>
      this.releaseBaseline(repo, toRelease, actor),
    );
    baseline = (await this.repository.getBaseline(baselineId))!;

    // Get workflow if specified
    let workflow: ApprovalWorkflow | null = null;
    if (workflowId) {
      workflow = await this.repository.getApprovalWorkflow(workflowId);
    }

    return { baseline, workflow };
  }

  // ============================================================================
  // P1A: APPROVAL WORKFLOWS
  // ============================================================================

  /**
   * Get all approval workflows
   */
  async listApprovalWorkflows(
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ items: ApprovalWorkflow[]; total: number }> {
    return this.repository.listApprovalWorkflows(limit, offset);
  }

  /**
   * Get workflow by ID
   */
  async getApprovalWorkflow(id: string): Promise<ApprovalWorkflow | null> {
    return this.repository.getApprovalWorkflow(id);
  }

  // ============================================================================
  // P1A: APPROVAL INSTANCES
  // ============================================================================

  /**
   * Create approval instance for a baseline
   */
  async createApprovalInstance(
    baselineId: string,
    workflowId: string,
    actor: string,
  ): Promise<ApprovalInstance> {
    const workflow = await this.repository.getApprovalWorkflow(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const instance: ApprovalInstance = {
      id: this.generateUUID(),
      workflowId,
      baselineId,
      status: ApprovalInstanceStatus.NOT_STARTED,
      currentStepSequence: 0,
      startedBy: actor,
      startedAt: new Date(),
      steps: [],
      revision: 1,
    };

    // Create step instances
    for (const wfStep of workflow.steps) {
      const step = {
        id: this.generateUUID(),
        approvalInstanceId: instance.id,
        sequence: wfStep.sequence,
        role: wfStep.role,
        status: ApprovalStepStatus.PENDING,
        required: wfStep.required,
      };
      instance.steps.push(step);
    }

    await this.repository.createApprovalInstance(instance);

    await this.repository.createAuditEvent({
      id: this.generateUUID(),
      entityType: 'APPROVAL_INSTANCE',
      entityId: instance.id,
      eventType: 'STARTED',
      newValue: instance,
      actor,
      timestamp: new Date(),
    });

    return instance;
  }

  /**
   * Get approval instance
   */
  async getApprovalInstance(id: string): Promise<ApprovalInstance | null> {
    return this.repository.getApprovalInstance(id);
  }

  /**
   * Get approvals for a baseline
   */
  async getBaselineApprovals(baselineId: string): Promise<ApprovalInstance[]> {
    return this.repository.listApprovalInstances(baselineId);
  }

  /**
   * Submit baseline for approval
   * 
   * P1B: Orchestrate the approval workflow
   * 1. Validate baseline state (must be DRAFT)
   * 2. Select workflow based on GxP relevance
   * 3. Create approval instance
   * 4. Create approval steps
   * 5. Activate first step
   * 6. Create audit event
   */
  async submitBaseline(baselineId: string, actor: string): Promise<ApprovalInstance> {
    const baseline = await this.repository.getBaseline(baselineId);
    if (!baseline) {
      throw new Error('Baseline not found');
    }

    if (baseline.status !== 'DRAFT') {
      throw new Error(`Cannot submit baseline in ${baseline.status} status. Must be DRAFT.`);
    }

    // Select workflow: GxP relevance determines standard or non-GxP workflow.
    // Only DIRECT and INDIRECT relevance require the three-step GxP workflow.
    // A plain truthiness check would also match the string 'NONE'.
    const requirementSet = await this.repository.getRequirementSet(baseline.requirementSetId);
    const isGxpRelevant =
      requirementSet?.gxpRelevance === GxPRelevance.DIRECT ||
      requirementSet?.gxpRelevance === GxPRelevance.INDIRECT;
    const workflowId = isGxpRelevant ? 'standard-gxp-urs' : 'non-gxp-urs';

    // Create approval instance (orchestrates step creation)
    const instance = await this.createApprovalInstance(
      baselineId,
      workflowId,
      actor,
    );

    // Update baseline status to IN_REVIEW
    await this.repository.updateBaseline({
      ...baseline,
      status: URSStatus.IN_REVIEW,
      revision: baseline.revision || 1,
    });

    // Audit submission
    await this.repository.createAuditEvent({
      id: this.generateUUID(),
      entityType: 'BASELINE',
      entityId: baselineId,
      eventType: 'SUBMITTED',
      newValue: { approvalInstanceId: instance.id },
      actor,
      timestamp: new Date(),
    });

    return instance;
  }

  /**
   * Approve an approval step
   * 
   * P1B: Process approval decision
   * - Actor from Backstage identity
   * - Update step status
   * - If final step: approve baseline, approve versions, supersede old versions, audit
   * - Activate next required step
   * - Create audit event
   */
  async approveApprovalStep(
    approvalInstanceId: string,
    stepId: string,
    actor: string,
    comment?: string,
    credentials?: BackstageCredentials,
  ): Promise<ApprovalInstance> {
    const instance = await this.repository.getApprovalInstance(approvalInstanceId);
    if (!instance) {
      throw new Error('Approval instance not found');
    }

    const step = instance.steps?.find(s => s.id === stepId);
    if (!step) {
      throw new Error('Approval step not found');
    }

    if (step.status !== 'PENDING' && step.status !== 'ACTIVE') {
      throw new Error(`Cannot approve step in ${step.status} status`);
    }

    // Role-based access: verify actor holds the step's required role.
    // ADMIN deliberately does not bypass this check. Segregation of duties
    // requires each approval step to be decided by its designated role; an
    // administrative override would make the approval chain unprovable.
    if (step.role) {
      const actorRoles = await this.getUserApprovalRoles(actor, credentials);
      if (!actorRoles.includes(step.role)) {
        throw new NotAllowedError(
          `This step requires role '${step.role}'. Your roles: ${actorRoles.join(', ') || 'none'}`,
        );
      }
    }

    // Everything below mutates state. The final approval fans out across the
    // baseline, the requirement set, its predecessor and every pinned version,
    // so it runs as one transaction: a failure part-way through must not leave
    // an approved baseline behind a half-updated version chain.
    return this.repository.withTransaction(async repo => {
      // Update step: mark as APPROVED
      step.status = ApprovalStepStatus.APPROVED;
      step.actedBy = actor;
      step.decision = 'APPROVED';
      step.comment = comment;
      step.actedAt = new Date();

      // updateApprovalInstance writes the instance row only, so the step has
      // to be written on its own. Without this the record of who approved
      // which step, and when, never reaches the database, and the chain can
      // never complete: the next call re-reads the step as still pending. The
      // in-memory repository hands back the same object it stores, so the
      // mutation above appeared to persist and hid this everywhere but
      // against PostgreSQL.
      await repo.updateApprovalStep(step);

      // Create audit event for step approval
      await repo.createAuditEvent({
        id: this.generateUUID(),
        entityType: 'APPROVAL_STEP',
        entityId: stepId,
        eventType: 'APPROVED',
        newValue: step,
        actor,
        timestamp: new Date(),
      });

      // Check if this is the final required step
      const remainingSteps = instance.steps.filter(
        s => s.required && s.status !== 'APPROVED' && s.id !== stepId,
      );

      if (remainingSteps.length === 0) {
        // Final approval: cascade to baseline and versions
        const baseline = await repo.getBaseline(instance.baselineId);
        if (!baseline) {
          throw new Error('Baseline not found');
        }

        // Completing the chain releases the baseline, not its contents: a
        // requirement version is released on its own quality signature. If any
        // pinned version is still unreleased, invariant 9 refuses here and
        // names them, rather than approving them as a side effect.
        await this.releaseBaseline(repo, baseline, actor);

        // Propagate approval to the requirement set and close the version
        // chain: once a revision is approved, its predecessor stops being
        // effective.
        const approvedSet = await repo.getRequirementSet(
          baseline.requirementSetId,
        );
        if (approvedSet) {
          if (approvedSet.status !== URSStatus.APPROVED) {
            await repo.updateRequirementSet({
              ...approvedSet,
              status: URSStatus.APPROVED,
              updatedBy: actor,
              updatedAt: new Date(),
            });

            // The set's own approval was previously unrecorded, which left a
            // hole in its audit trail and in the workflow view derived from it.
            await repo.createAuditEvent({
              id: this.generateUUID(),
              entityType: 'REQUIREMENT_SET',
              entityId: approvedSet.id,
              entityVersion: `v${approvedSet.versionNumber}`,
              eventType: 'APPROVED',
              oldValue: { status: approvedSet.status },
              newValue: {
                status: URSStatus.APPROVED,
                baselineId: baseline.id,
              },
              actor,
              timestamp: new Date(),
            });
          }

          if (approvedSet.supersedesRef) {
            const predecessor = await repo.getRequirementSet(
              approvedSet.supersedesRef,
            );
            if (predecessor && predecessor.status !== URSStatus.SUPERSEDED) {
              await repo.updateRequirementSet({
                ...predecessor,
                status: URSStatus.SUPERSEDED,
                updatedBy: actor,
                updatedAt: new Date(),
              });

              await repo.createAuditEvent({
                id: this.generateUUID(),
                entityType: 'REQUIREMENT_SET',
                entityId: predecessor.id,
                entityVersion: `v${predecessor.versionNumber}`,
                eventType: 'SUPERSEDED',
                newValue: {
                  status: URSStatus.SUPERSEDED,
                  supersededBy: approvedSet.id,
                },
                actor: 'system',
                timestamp: new Date(),
              });
            }
          }
        }

        // Mark approval instance as APPROVED
        instance.status = ApprovalInstanceStatus.APPROVED;
        instance.completedBy = actor;
        instance.completedAt = new Date();

        // Audit final approval
        await repo.createAuditEvent({
          id: this.generateUUID(),
          entityType: 'APPROVAL_INSTANCE',
          entityId: instance.id,
          eventType: 'COMPLETED',
          newValue: instance,
          actor,
          timestamp: new Date(),
        });
      } else {
        // Activate next required step
        const nextStep = instance.steps.find(
          s => s.required && s.status === 'PENDING',
        );
        if (nextStep) {
          nextStep.status = ApprovalStepStatus.ACTIVE;
          await repo.updateApprovalStep(nextStep);
        }

        instance.status = ApprovalInstanceStatus.IN_PROGRESS;
        instance.currentStepSequence = (instance.currentStepSequence || 0) + 1;
      }

      // Update approval instance
      await repo.updateApprovalInstance(instance);

      return instance;
    });
  }

  /**
   * Reject an approval step
   * 
   * P1B: Process rejection
   * - Actor from Backstage identity
   * - Reason/comment required
   * - Mark step as REJECTED
   * - Mark approval instance as REJECTED
   * - Preserve baseline and versions (no delete)
   * - Create audit event
   */
  async rejectApprovalStep(
    approvalInstanceId: string,
    stepId: string,
    actor: string,
    reason: string,
    credentials?: BackstageCredentials,
  ): Promise<ApprovalInstance> {
    if (!reason) {
      throw new Error('Rejection reason is required');
    }

    const instance = await this.repository.getApprovalInstance(approvalInstanceId);
    if (!instance) {
      throw new Error('Approval instance not found');
    }

    const step = instance.steps?.find(s => s.id === stepId);
    if (!step) {
      throw new Error('Approval step not found');
    }

    if (step.status !== 'PENDING' && step.status !== 'ACTIVE') {
      throw new Error(`Cannot reject step in ${step.status} status`);
    }

    // Role-based access: verify actor holds the step's required role.
    // ADMIN deliberately does not bypass this check. Segregation of duties
    // requires each approval step to be decided by its designated role; an
    // administrative override would make the approval chain unprovable.
    if (step.role) {
      const actorRoles = await this.getUserApprovalRoles(actor, credentials);
      if (!actorRoles.includes(step.role)) {
        throw new NotAllowedError(
          `This step requires role '${step.role}'. Your roles: ${actorRoles.join(', ') || 'none'}`,
        );
      }
    }

    // Update step: mark as REJECTED
    step.status = ApprovalStepStatus.REJECTED;
    step.actedBy = actor;
    step.decision = 'REJECTED';
    step.comment = reason;
    step.actedAt = new Date();

    // See approveApprovalStep: the instance update does not carry its steps.
    await this.repository.updateApprovalStep(step);

    // Mark approval instance as REJECTED
    instance.status = ApprovalInstanceStatus.REJECTED;
    instance.completedBy = actor;
    instance.completedAt = new Date();

    // Update approval instance
    await this.repository.updateApprovalInstance(instance);

    // Audit rejection
    await this.repository.createAuditEvent({
      id: this.generateUUID(),
      entityType: 'APPROVAL_INSTANCE',
      entityId: instance.id,
      eventType: 'REJECTED',
      newValue: { reason, rejectedByStep: stepId },
      actor,
      timestamp: new Date(),
    });

    return instance;
  }

  /**
   * Cancel an approval instance
   *
   * - Only NOT_STARTED or IN_PROGRESS instances can be cancelled
   * - All open steps (PENDING/ACTIVE) are marked SKIPPED
   * - Instance status → CANCELLED
   * - Baseline status is NOT changed (remains DRAFT/IN_REVIEW, can be re-submitted)
   * - Audit event created
   */
  async cancelApprovalInstance(
    approvalInstanceId: string,
    actor: string,
    reason?: string,
  ): Promise<ApprovalInstance> {
    const instance = await this.repository.getApprovalInstance(approvalInstanceId);
    if (!instance) {
      throw new Error('Approval instance not found');
    }

    if (
      instance.status !== ApprovalInstanceStatus.NOT_STARTED &&
      instance.status !== ApprovalInstanceStatus.IN_PROGRESS
    ) {
      throw new Error(
        `Cannot cancel approval in ${instance.status} status. Only NOT_STARTED or IN_PROGRESS can be cancelled.`,
      );
    }

    // Skip all open steps
    for (const step of instance.steps) {
      if (step.status === ApprovalStepStatus.PENDING || step.status === ApprovalStepStatus.ACTIVE) {
        step.status = ApprovalStepStatus.SKIPPED;
        step.actedBy = actor;
        step.actedAt = new Date();
        await this.repository.updateApprovalStep(step);
      }
    }

    // Mark instance as CANCELLED
    instance.status = ApprovalInstanceStatus.CANCELLED;
    instance.completedBy = actor;
    instance.completedAt = new Date();

    await this.repository.updateApprovalInstance(instance);

    await this.repository.createAuditEvent({
      id: this.generateUUID(),
      entityType: 'APPROVAL_INSTANCE',
      entityId: instance.id,
      eventType: 'CANCELLED',
      newValue: { reason: reason || null },
      actor,
      timestamp: new Date(),
    });

    return instance;
  }

  async generateRequirementSuggestions(
    requirementSetId: string,
    actor: string,
  ): Promise<GeneratedRequirement[]> {
    if (!this.llmClient) {
      throw new Error('AI is not configured');
    }

    const set = await this.repository.getRequirementSet(requirementSetId);
    if (!set) {
      throw new Error(`Requirement set not found: ${requirementSetId}`);
    }

    const existingRequirements = await this.repository.getRequirements(requirementSetId);

    const capabilities: string[] = [];
    for (const ref of set.businessCapabilityRefs) {
      try {
        const cap = await this.repository.getBusinessCapability(ref);
        if (cap) {
          capabilities.push(cap.name);
        } else {
          capabilities.push(ref);
        }
      } catch {
        capabilities.push(ref);
      }
    }

    const context = {
      businessCapabilities: capabilities,
      businessNeed: {
        title: set.businessNeed,
        desiredOutcome: set.desiredOutcome,
        businessValue: set.businessValue,
      },
      context: {
        title: set.solutionName,
        scope: set.scope,
        outOfScope: set.outOfScope,
        processContext: set.processContext,
        gxpRelevance: set.gxpRelevance,
        patientImpact: set.patientImpact,
        dataIntegrityImpact: set.dataIntegrityImpact,
        electronicRecords: set.electronicRecords,
      },
      existingRequirements: existingRequirements.map(r => r.title),
    };

    const { buildSystemPrompt } = await import('./prompt-template');
    const systemPrompt = buildSystemPrompt();

    this.logger.info(
      `Generating AI requirement suggestions for set ${requirementSetId} by ${actor}`,
    );

    const suggestions = await this.llmClient.generateRequirements(context, systemPrompt);

    await this.repository.createAuditEvent({
      id: this.generateUUID(),
      entityType: 'REQUIREMENT_SET',
      entityId: requirementSetId,
      eventType: 'AI_SUGGESTIONS_GENERATED',
      newValue: { count: suggestions.length },
      actor,
      timestamp: new Date(),
    });

    return suggestions;
  }
}
