/**
 * URS Composer Service
 * Business logic layer for requirement management
 */

import { LoggerService } from '@backstage/backend-plugin-api';
import {
  RequirementSet,
  URSRequirement,
  Approval,
  AuditEvent,
  URSStatus,
  ApprovalStatus,
  ApprovalRole,
  QualityCheckResult,
  SolutionType,
  GxPRelevance,
  RequirementVersion,
  Baseline,
  ApprovalWorkflow,
  ApprovalInstance,
  ApprovalInstanceStatus,
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

  constructor(options: URSServiceOptions) {
    this.logger = options.logger;
    this.repository = options.repository;
    this.llmClient = options.llmClient;
  }

  /**
   * Get all business capabilities (persisted, ACTIVE)
   */
  async getCapabilities(): Promise<BusinessCapabilityPersisted[]> {
    const { items } = await this.repository.listBusinessCapabilities(1000, 0);
    return items;
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
   * Submit requirement set for review
   */
  async submitForReview(
    requirementSetId: string,
    actor: string,
    reason?: string,
  ): Promise<RequirementSet> {
    const requirementSet = await this.repository.getRequirementSet(
      requirementSetId,
    );
    if (!requirementSet) {
      throw new Error('Requirement set not found');
    }

    if (requirementSet.status !== URSStatus.DRAFT) {
      throw new Error('Only DRAFT requirement sets can be submitted');
    }

    // Update status
    const updated = { ...requirementSet, status: URSStatus.IN_REVIEW };
    await this.repository.updateRequirementSet(updated);

    // Create approval gates
    const roles = [
      ApprovalRole.BUSINESS_REVIEWER,
      ApprovalRole.PRODUCT_MANAGER,
      ApprovalRole.QUALITY_REVIEWER,
    ];

    for (let i = 0; i < roles.length; i++) {
      await this.repository.createApproval({
        id: this.generateUUID(),
        requirementSetId,
        approvalRole: roles[i],
        status: ApprovalStatus.PENDING,
        sequenceNumber: i + 1,
      });
    }

    // Audit
    await this.repository.createAuditEvent({
      id: this.generateUUID(),
      entityType: 'REQUIREMENT_SET',
      entityId: requirementSetId,
      eventType: 'SUBMITTED',
      oldValue: { status: URSStatus.DRAFT },
      newValue: { status: URSStatus.IN_REVIEW },
      actor,
      timestamp: new Date(),
      reason,
    });

    return updated;
  }

  /**
   * Approve requirement set
   */
  async approveRequirementSet(
    requirementSetId: string,
    actor: string,
  ): Promise<RequirementSet> {
    const requirementSet = await this.repository.getRequirementSet(
      requirementSetId,
    );
    if (!requirementSet) {
      throw new Error('Requirement set not found');
    }

    if (requirementSet.status !== URSStatus.IN_REVIEW) {
      throw new Error('Only IN_REVIEW requirement sets can be approved');
    }

    // Mark all approvals as approved
    await this.repository.approveAll(requirementSetId, actor);

    // Update status to APPROVED
    const updated = { ...requirementSet, status: URSStatus.APPROVED };
    await this.repository.updateRequirementSet(updated);

    // Audit
    await this.repository.createAuditEvent({
      id: this.generateUUID(),
      entityType: 'REQUIREMENT_SET',
      entityId: requirementSetId,
      eventType: 'APPROVED',
      oldValue: { status: URSStatus.IN_REVIEW },
      newValue: { status: URSStatus.APPROVED },
      actor,
      timestamp: new Date(),
    });

    return updated;
  }

  /**
   * Reject requirement set
   */
  async rejectRequirementSet(
    requirementSetId: string,
    actor: string,
    reason: string,
  ): Promise<RequirementSet> {
    const requirementSet = await this.repository.getRequirementSet(
      requirementSetId,
    );
    if (!requirementSet) {
      throw new Error('Requirement set not found');
    }

    if (requirementSet.status !== URSStatus.IN_REVIEW) {
      throw new Error('Only IN_REVIEW requirement sets can be rejected');
    }

    // Clear approvals, reset to DRAFT
    await this.repository.clearApprovals(requirementSetId);
    const updated = { ...requirementSet, status: URSStatus.DRAFT };
    await this.repository.updateRequirementSet(updated);

    // Audit
    await this.repository.createAuditEvent({
      id: this.generateUUID(),
      entityType: 'REQUIREMENT_SET',
      entityId: requirementSetId,
      eventType: 'REJECTED',
      oldValue: { status: URSStatus.IN_REVIEW },
      newValue: { status: URSStatus.DRAFT },
      actor,
      timestamp: new Date(),
      reason,
    });

    return updated;
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

  /**
   * Get approvals for requirement set
   */
  async getApprovals(requirementSetId: string): Promise<Approval[]> {
    return this.repository.getApprovals(requirementSetId);
  }

  // PRIVATE HELPERS

  private generateUUID(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
        sequence: wfStep.sequence,
        role: wfStep.role,
        status: 'PENDING' as any,
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

    // Select workflow: GxP relevance determines standard or non-GxP workflow
    let workflowId = 'non-gxp-urs';
    const requirementSet = await this.repository.getRequirementSet(baseline.requirementSetId);
    if (requirementSet && requirementSet.gxpRelevance) {
      workflowId = 'standard-gxp-urs';
    }

    // Create approval instance (orchestrates step creation)
    const instance = await this.createApprovalInstance(
      baselineId,
      workflowId,
      actor,
    );

    // Update baseline status to IN_REVIEW
    await this.repository.updateBaseline({
      ...baseline,
      status: 'IN_REVIEW' as any,
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

    // Update step: mark as APPROVED
    step.status = 'APPROVED' as any;
    step.actedBy = actor;
    step.decision = 'APPROVED';
    step.comment = comment;
    step.actedAt = new Date();

    // Create audit event for step approval
    await this.repository.createAuditEvent({
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
      const baseline = await this.repository.getBaseline(instance.baselineId);
      if (!baseline) {
        throw new Error('Baseline not found');
      }

      // Update baseline to APPROVED
      await this.repository.updateBaseline({
        ...baseline,
        status: 'APPROVED' as any,
        approvedBy: actor,
        approvedAt: new Date(),
        revision: baseline.revision || 1,
      });

      // Approve all requirement versions in this baseline
      for (const versionId of baseline.requirementVersionIds) {
        const version = await this.repository.getRequirementVersion(versionId);
        if (version && version.status !== 'APPROVED') {
          await this.repository.updateRequirementVersion({
            ...version,
            status: 'APPROVED' as any,
            approvedBy: actor,
            approvedAt: new Date(),
          });

          // Supersede any previous versions
          const previousVersions = await this.repository.getRequirementVersions(
            version.requirementId,
          );
          for (const prev of previousVersions) {
            if (prev.id !== versionId && prev.status === 'APPROVED') {
              await this.repository.updateRequirementVersion({
                ...prev,
                status: 'SUPERSEDED' as any,
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
      await this.repository.createAuditEvent({
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
      const nextStep = instance.steps.find(s => s.required && s.status === 'PENDING');
      if (nextStep) {
        nextStep.status = 'ACTIVE' as any;
      }

      instance.status = ApprovalInstanceStatus.IN_PROGRESS;
      instance.currentStepSequence = (instance.currentStepSequence || 0) + 1;
    }

    // Update approval instance
    await this.repository.updateApprovalInstance(instance);

    return instance;
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

    // Update step: mark as REJECTED
    step.status = 'REJECTED' as any;
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

    const existingRequirements = await this.repository.listRequirements(requirementSetId);

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
