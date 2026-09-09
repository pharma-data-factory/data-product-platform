/**
 * URS Composer Service
 * Business logic layer for requirement management
 */

import { randomUUID } from 'crypto';
import { LoggerService } from '@backstage/backend-plugin-api';
import { InputError, NotAllowedError, NotFoundError } from '@backstage/errors';
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
} from './types';
import { IURSRepository } from './repository-interface';
import { nextMinorVersion, getVersionNumber } from './services/versioningService';
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

    return saved;
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
   * Create a revision of an existing requirement version
   */
  async createRevision(
    previousVersionId: string,
    revisionReason: string,
    actor: string,
  ): Promise<RequirementVersion> {
    const previous = await this.repository.getRequirementVersion(previousVersionId);
    if (!previous) {
      throw new Error('Previous version not found');
    }

    const nextVersion = nextMinorVersion(previous.version);
    const newVersion: RequirementVersion = {
      id: this.generateUUID(),
      requirementId: previous.requirementId,
      version: nextVersion,
      versionNumber: getVersionNumber(nextVersion),
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
      revision: 1,
    };

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

  /**
   * Get specific version
   */
  async getVersion(versionId: string): Promise<RequirementVersion | null> {
    return this.repository.getRequirementVersion(versionId);
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
    const baseline: Baseline = {
      id: this.generateUUID(),
      requirementSetId,
      baselineVersion,
      status: URSStatus.DRAFT,
      requirementVersionIds,
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
    const baseline = await this.repository.getBaseline(baselineId);
    if (!baseline) {
      throw new Error('Baseline not found');
    }

    if (baseline.status !== URSStatus.DRAFT) {
      throw new Error(`Cannot approve baseline in ${baseline.status} status`);
    }

    // Supersede previous approved baseline
    const prevApproved = await this.repository.getCurrentApprovedBaseline(
      baseline.requirementSetId,
    );
    if (prevApproved) {
      prevApproved.status = URSStatus.SUPERSEDED;
      prevApproved.supersededBy = baseline.id;
      await this.repository.updateBaseline(prevApproved);

      await this.repository.createAuditEvent({
        id: this.generateUUID(),
        entityType: 'BASELINE',
        entityId: prevApproved.id,
        entityVersion: prevApproved.baselineVersion,
        eventType: 'SUPERSEDED',
        newValue: { status: URSStatus.SUPERSEDED },
        actor: 'system',
        timestamp: new Date(),
      });
    }

    // Update baseline
    baseline.status = URSStatus.APPROVED;
    baseline.approvedBy = actor;
    baseline.approvedAt = new Date();
    baseline.revision++;
    await this.repository.updateBaseline(baseline);

    // Audit
    await this.repository.createAuditEvent({
      id: this.generateUUID(),
      entityType: 'BASELINE',
      entityId: baseline.id,
      entityVersion: baseline.baselineVersion,
      eventType: 'APPROVED',
      newValue: baseline,
      actor,
      timestamp: new Date(),
    });

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

        // Update baseline to APPROVED
        await repo.updateBaseline({
          ...baseline,
          status: URSStatus.APPROVED,
          approvedBy: actor,
          approvedAt: new Date(),
          revision: baseline.revision || 1,
        });

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

        // Approve all requirement versions in this baseline
        for (const versionId of baseline.requirementVersionIds) {
          const version = await repo.getRequirementVersion(versionId);
          if (version && version.status !== 'APPROVED') {
            await repo.updateRequirementVersion({
              ...version,
              status: URSStatus.APPROVED,
              approvedBy: actor,
              approvedAt: new Date(),
            });

            // Supersede any previous versions
            const previousVersions = await repo.getRequirementVersions(
              version.requirementId,
            );
            for (const prev of previousVersions) {
              if (prev.id !== versionId && prev.status === 'APPROVED') {
                await repo.updateRequirementVersion({
                  ...prev,
                  status: URSStatus.SUPERSEDED,
                  supersededBy: versionId,
                });
              }
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
