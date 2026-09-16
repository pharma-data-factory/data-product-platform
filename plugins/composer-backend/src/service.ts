/**
 * Product Composer service layer.
 *
 * Owns Product/Version/Component/Contract CRUD plus traceability links.
 * Writes an append-only audit event for each mutation (ALCOA-aligned).
 */

import { LoggerService } from '@backstage/backend-plugin-api';
import { ConflictError, InputError } from '@backstage/errors';
import { randomUUID } from 'crypto';
import {
  DataClassification,
  InterfaceType,
  Product,
  ProductBaseline,
  ProductBaselineDelta,
  ProductComponent,
  ProductVersion,
  SnapshotItemChange,
  TraceabilityLink,
  nextProductVersionLabel,
  validateProduct,
  validateProductVersionLabel,
  validateTraceabilityLink,
} from '@internal/platform-common';
import { IComposerRepository, ComposerAuditEvent } from './repository-interface';
import { evaluatePlatformPolicy } from './platform-policy';
import {
  CreateDataContractRequest,
  CreateProductBaselineRequest,
  CreateProductComponentRequest,
  CreateProductRequest,
  CreateProductVersionRequest,
  CreateTraceabilityLinkRequest,
  DataContract,
  TransitionProductVersionRequest,
  AISpecDraft,
} from './types';
import type { UrsBaselineResolver } from './urs-baseline-resolver';
import {
  toComponentType,
  type AvailableComponentSummary,
  type ComposerLLMClient,
} from './llm-client';
import { buildSystemPrompt } from './prompt-template';
import type { ProductSpecContext } from './prompt-template';

export interface ReleaseGateBlocker {
  code: string;
  message: string;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['APPROVED'],
  APPROVED: ['RELEASE_CANDIDATE'],
  RELEASE_CANDIDATE: ['RELEASED', 'DRAFT'],
  RELEASED: ['SUPERSEDED'],
  SUPERSEDED: [],
};

export interface ComposerServiceOptions {
  logger: LoggerService;
  repository: IComposerRepository;
  ursBaselineResolver?: UrsBaselineResolver;
  llmClient?: ComposerLLMClient;
}

export class ComposerService {
  private readonly logger: LoggerService;
  private readonly repository: IComposerRepository;
  private readonly ursBaselineResolver?: UrsBaselineResolver;
  private readonly llmClient?: ComposerLLMClient;
  private readonly specDrafts = new Map<string, AISpecDraft>();

  constructor(options: ComposerServiceOptions) {
    this.logger = options.logger;
    this.repository = options.repository;
    this.ursBaselineResolver = options.ursBaselineResolver;
    this.llmClient = options.llmClient;
  }

  async createProduct(
    request: CreateProductRequest,
    actor: string,
  ): Promise<Product> {
    const issues = validateProduct(request);
    if (issues.length > 0) {
      throw new Error(issues.join('; '));
    }
    const product: Product = {
      id: randomUUID(),
      name: request.name,
      description: request.description,
      businessPurpose: request.businessPurpose,
      productType: request.productType as Product['productType'],
      domain: request.domain,
      subdomain: request.subdomain,
      owner: request.owner,
      team: request.team,
      lifecycle: (request.lifecycle as Product['lifecycle']) || 'EXPERIMENTAL',
      status: 'ACTIVE',
      criticality: request.criticality,
      gxpRelevance: request.gxpRelevance,
      dataClassification: request.dataClassification as
        | DataClassification
        | undefined,
      consumers: request.consumers,
      slo: request.slo,
      costInfo: request.costInfo,
      createdBy: actor,
      createdAt: new Date(),
      revision: 1,
    };
    await this.repository.createProduct(product);
    await this.audit('PRODUCT', product.id, 'PRODUCT_CREATED', actor);
    return product;
  }

  async listProducts(
    limit: number,
    offset: number,
  ): Promise<{ items: Product[]; total: number }> {
    return this.repository.listProducts(limit, offset);
  }

  async getProduct(id: string): Promise<Product | null> {
    return this.repository.getProduct(id);
  }

  async updateProduct(
    id: string,
    request: Partial<CreateProductRequest>,
    actor: string,
  ): Promise<Product> {
    const existing = await this.repository.getProduct(id);
    if (!existing) {
      throw new Error(`Product ${id} not found`);
    }
    const updated: Product = {
      ...existing,
      name: request.name ?? existing.name,
      description: request.description ?? existing.description,
      businessPurpose: request.businessPurpose ?? existing.businessPurpose,
      domain: request.domain ?? existing.domain,
      subdomain: request.subdomain ?? existing.subdomain,
      owner: request.owner ?? existing.owner,
      team: request.team ?? existing.team,
      criticality: request.criticality ?? existing.criticality,
      gxpRelevance: request.gxpRelevance ?? existing.gxpRelevance,
      updatedBy: actor,
      updatedAt: new Date(),
      revision: existing.revision + 1,
    };
    await this.repository.updateProduct(updated);
    await this.audit('PRODUCT', id, 'PRODUCT_UPDATED', actor);
    return updated;
  }

  async createProductVersion(
    productId: string,
    request: CreateProductVersionRequest,
    actor: string,
  ): Promise<ProductVersion> {
    const product = await this.repository.getProduct(productId);
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }
    const versions = await this.repository.listProductVersions(productId);

    // An absent version means "number it for me". A version that is present
    // but blank is a malformed request, not an omitted one — silently
    // generating a label there would invent version identity on the caller's
    // behalf without them knowing which one they got.
    const supplied = request.version;
    const label =
      supplied === undefined || supplied === null
        ? nextProductVersionLabel(versions.map(existing => existing.version))
        : String(supplied).trim();

    const labelIssues = validateProductVersionLabel(label);
    if (labelIssues.length > 0) {
      throw new InputError(labelIssues.join('; '));
    }

    // (product_id, version) is unique in the schema. Checking here turns a
    // duplicate into a client error instead of a driver error surfacing as a
    // 500, and keeps the message about the domain rather than the index.
    if (versions.some(existing => existing.version === label)) {
      throw new ConflictError(
        `Product ${productId} already exists at version ${label}`,
      );
    }

    // The ordinal is a per-product sequence that only ever moves forward, so
    // it stays a stable ordering key even when a caller supplies labels out of
    // order. Deriving it from the row count would reuse an ordinal after any
    // future deletion, and would drift from the labels as soon as one was
    // supplied explicitly.
    const versionNumber =
      versions.reduce(
        (highest, existing) => Math.max(highest, existing.versionNumber ?? 0),
        0,
      ) + 1;

    const version: ProductVersion = {
      id: randomUUID(),
      productId,
      version: label,
      versionNumber,
      status: 'DRAFT',
      changelog: request.changelog,
      createdBy: actor,
      createdAt: new Date(),
      revision: 1,
    };
    await this.repository.createProductVersion(version);
    await this.audit('PRODUCT_VERSION', version.id, 'PRODUCT_VERSION_CREATED', actor);
    return version;
  }

  async listProductVersions(productId: string): Promise<ProductVersion[]> {
    return this.repository.listProductVersions(productId);
  }

  async getProductVersion(id: string): Promise<ProductVersion | null> {
    return this.repository.getProductVersion(id);
  }

  async addProductComponent(
    versionId: string,
    request: CreateProductComponentRequest,
    actor: string,
  ): Promise<ProductComponent> {
    const version = await this.repository.getProductVersion(versionId);
    if (!version) {
      throw new Error(`Product version ${versionId} not found`);
    }
    if (!request.name?.trim()) {
      throw new Error('Component name is required');
    }
    const component: ProductComponent = {
      id: randomUUID(),
      productVersionId: versionId,
      componentType: request.componentType as ProductComponent['componentType'],
      name: request.name,
      description: request.description,
      ref: request.ref,
      interfaceType: request.interfaceType as InterfaceType | undefined,
      sourceSystem: request.sourceSystem,
      targetSystem: request.targetSystem,
      config: request.config,
      createdBy: actor,
      createdAt: new Date(),
      revision: 1,
    };
    await this.repository.createProductComponent(component);
    await this.audit('PRODUCT_COMPONENT', component.id, 'PRODUCT_COMPONENT_CREATED', actor);
    return component;
  }

  async listProductComponents(versionId: string): Promise<ProductComponent[]> {
    return this.repository.listProductComponents(versionId);
  }

  async addDataContract(
    componentId: string,
    request: CreateDataContractRequest,
    actor: string,
  ): Promise<DataContract> {
    if (!request.schemaType?.trim()) {
      throw new Error('Data contract schemaType is required');
    }
    const contract: DataContract = {
      id: randomUUID(),
      productComponentId: componentId,
      schemaType: request.schemaType as DataContract['schemaType'],
      schemaRef: request.schemaRef,
      contractSpec: request.contractSpec,
      status: 'DRAFT',
      version: request.version ?? '1.0',
      createdBy: actor,
      createdAt: new Date(),
      revision: 1,
    };
    await this.repository.createDataContract(contract);
    await this.audit('DATA_CONTRACT', contract.id, 'DATA_CONTRACT_CREATED', actor);
    return contract;
  }

  async createTraceabilityLink(
    request: CreateTraceabilityLinkRequest,
    actor: string,
  ): Promise<TraceabilityLink> {
    const issues = validateTraceabilityLink(request);
    if (issues.length > 0) {
      throw new Error(issues.join('; '));
    }
    const link: TraceabilityLink = {
      id: randomUUID(),
      sourceType: request.sourceType,
      sourceId: request.sourceId,
      sourceRevision: request.sourceRevision,
      relationshipType:
        request.relationshipType as TraceabilityLink['relationshipType'],
      targetType: request.targetType,
      targetId: request.targetId,
      targetRevision: request.targetRevision,
      metadata: request.metadata,
      createdBy: actor,
      createdAt: new Date(),
    };
    await this.repository.createTraceabilityLink(link);
    await this.audit('TRACEABILITY_LINK', link.id, 'TRACEABILITY_LINK_CREATED', actor);
    return link;
  }

  async deleteTraceabilityLink(id: string, actor: string): Promise<void> {
    await this.repository.deleteTraceabilityLink(id);
    await this.audit('TRACEABILITY_LINK', id, 'TRACEABILITY_LINK_DELETED', actor);
  }

  async transitionProductVersionStatus(
    versionId: string,
    request: TransitionProductVersionRequest,
    actor: string,
  ): Promise<ProductVersion> {
    const version = await this.repository.getProductVersion(versionId);
    if (!version) {
      throw new Error(`Product version ${versionId} not found`);
    }
    const allowed = VALID_TRANSITIONS[version.status] ?? [];
    if (!allowed.includes(request.targetStatus)) {
      throw new Error(
        `Invalid transition from ${version.status} to ${request.targetStatus}`,
      );
    }
    if (request.targetStatus === 'RELEASED') {
      const gate = await this.checkReleaseGate(versionId);
      if (!gate.passed) {
        throw new Error(
          `Release gate failed: ${gate.blockers.map(b => b.code).join(', ')}`,
        );
      }
    }
    const oldStatus = version.status;
    const updated: ProductVersion = {
      ...version,
      status: request.targetStatus as ProductVersion['status'],
      releaseCommitSha: request.releaseCommitSha ?? version.releaseCommitSha,
      artifactDigest: request.artifactDigest ?? version.artifactDigest,
    };
    if (request.targetStatus === 'APPROVED' || request.targetStatus === 'RELEASED') {
      updated.approvedBy = actor;
      updated.approvedAt = new Date();
    }
    await this.repository.updateProductVersion(updated);
    await this.audit('PRODUCT_VERSION', versionId, 'STATUS_TRANSITION', actor, {
      oldValue: oldStatus,
      newValue: request.targetStatus,
    });
    return updated;
  }

  async checkReleaseGate(versionId: string): Promise<{
    passed: boolean;
    blockers: ReleaseGateBlocker[];
  }> {
    const blockers: ReleaseGateBlocker[] = [];
    const version = await this.repository.getProductVersion(versionId);
    if (!version) {
      throw new Error(`Product version ${versionId} not found`);
    }
    if (version.status !== 'RELEASE_CANDIDATE') {
      blockers.push({
        code: 'INVALID_STATUS',
        message: `Version must be RELEASE_CANDIDATE, got ${version.status}`,
      });
    }
    const components = await this.repository.listProductComponents(versionId);
    if (components.length === 0) {
      blockers.push({
        code: 'NO_COMPONENTS',
        message: 'Version must have at least one component',
      });
    }
    const allLinks = await this.repository.listTraceabilityLinks();
    const componentIds = new Set(components.map(c => c.id));
    const linkedComponentIds = new Set(
      allLinks
        .filter(l => componentIds.has(l.sourceId) || componentIds.has(l.targetId))
        .map(l => (componentIds.has(l.sourceId) ? l.sourceId : l.targetId)),
    );
    for (const comp of components) {
      if (!linkedComponentIds.has(comp.id)) {
        blockers.push({
          code: 'INCOMPLETE_TRACEABILITY',
          message: `Component ${comp.name} (${comp.id}) has no traceability link`,
        });
        break;
      }
    }
    const baselines = await this.repository.listProductBaselines(versionId);
    const approvedBaseline = baselines.find(b => b.status === 'APPROVED');
    if (!approvedBaseline) {
      blockers.push({
        code: 'NO_APPROVED_BASELINE',
        message: 'An approved product baseline is required',
      });
    }

    // Platform policy: the obligations a product must meet regardless of what
    // its requirements say. Checked here rather than at creation for the same
    // reason as the URS binding — experimenting stays free, releasing does not.
    const product = await this.repository.getProduct(version.productId);
    if (product) {
      for (const finding of evaluatePlatformPolicy(product)) {
        blockers.push({
          code: 'POLICY_OBLIGATION_UNMET',
          message: `${finding.title}: ${finding.message}`,
        });
      }
    }

    // A product must say which requirements it implements before it is
    // released. Creating one without a URS stays allowed — this is the single
    // point where the binding becomes mandatory, so experimenting is free and
    // nothing unattributed reaches production.
    const ursBaselineIds = approvedBaseline?.ursBaselineIds ?? [];
    if (approvedBaseline && ursBaselineIds.length === 0) {
      blockers.push({
        code: 'NO_URS_BASELINE',
        message:
          'This product references no URS baseline. Bind it to an approved ' +
          'baseline before releasing, so the release states which requirements ' +
          'it implements.',
      });
    }

    // Cross-plugin: verify referenced URS baselines are APPROVED
    if (this.ursBaselineResolver && ursBaselineIds.length > 0) {
      for (const ursId of ursBaselineIds) {
        try {
          await this.ursBaselineResolver.resolveApprovedBaseline(ursId);
        } catch (err) {
          blockers.push({
            code: 'NO_APPROVED_URS_BASELINE',
            message: `URS baseline ${ursId} is not approved: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      }
    }

    return { passed: blockers.length === 0, blockers };
  }

  async createProductBaseline(
    productVersionId: string,
    request: CreateProductBaselineRequest,
    actor: string,
  ): Promise<ProductBaseline> {
    const version = await this.repository.getProductVersion(productVersionId);
    if (!version) {
      throw new Error(`Product version ${productVersionId} not found`);
    }
    const existing = await this.repository.listProductBaselines(productVersionId);
    for (const prev of existing) {
      if (prev.status === 'APPROVED') {
        const superseded: ProductBaseline = {
          ...prev,
          status: 'SUPERSEDED',
          supersededBy: 'pending',
        };
        await this.repository.updateProductBaseline(superseded);
      }
    }
    const components = await this.repository.listProductComponents(productVersionId);
    const contracts: DataContract[] = [];
    for (const comp of components) {
      contracts.push(...(await this.repository.listDataContracts(comp.id)));
    }
    const links = (await this.repository.listTraceabilityLinks()).filter(
      l =>
        components.some(c => c.id === l.sourceId) ||
        components.some(c => c.id === l.targetId),
    );
    const snapshot = {
      version: { id: version.id, version: version.version },
      components: components.map(c => ({
        id: c.id,
        name: c.name,
        componentType: c.componentType,
      })),
      contracts: contracts.map(c => ({
        id: c.id,
        schemaType: c.schemaType,
        version: c.version,
      })),
      traceabilityLinks: links.map(l => ({
        id: l.id,
        sourceId: l.sourceId,
        targetType: l.targetType,
        targetId: l.targetId,
        relationshipType: l.relationshipType,
      })),
    };
    const baselineVersion =
      request.baselineVersion ?? `${existing.length + 1}.0`;
    const baseline: ProductBaseline = {
      id: randomUUID(),
      productVersionId,
      baselineVersion,
      status: 'DRAFT',
      snapshot,
      ursBaselineIds: request.ursBaselineIds,
      createdBy: actor,
      createdAt: new Date(),
      revision: 1,
    };
    await this.repository.createProductBaseline(baseline);
    await this.audit('PRODUCT_BASELINE', baseline.id, 'BASELINE_CREATED', actor);
    return baseline;
  }

  async approveProductBaseline(
    baselineId: string,
    actor: string,
  ): Promise<ProductBaseline> {
    const baseline = await this.repository.getProductBaseline(baselineId);
    if (!baseline) {
      throw new Error(`Product baseline ${baselineId} not found`);
    }
    if (baseline.status !== 'DRAFT') {
      throw new Error(`Cannot approve baseline in status ${baseline.status}`);
    }
    const approved: ProductBaseline = {
      ...baseline,
      status: 'APPROVED',
      approvedBy: actor,
      approvedAt: new Date(),
    };
    await this.repository.updateProductBaseline(approved);
    await this.audit('PRODUCT_BASELINE', baselineId, 'BASELINE_APPROVED', actor);
    return approved;
  }

  async getProductBaseline(id: string): Promise<ProductBaseline | null> {
    return this.repository.getProductBaseline(id);
  }

  async listProductBaselines(
    productVersionId: string,
  ): Promise<ProductBaseline[]> {
    return this.repository.listProductBaselines(productVersionId);
  }

  async computeProductBaselineDelta(
    baselineId: string,
    actor: string,
  ): Promise<ProductBaselineDelta> {
    const baseline = await this.repository.getProductBaseline(baselineId);
    if (!baseline) {
      throw new Error(`Product baseline ${baselineId} not found`);
    }

    const allBaselines = await this.repository.listProductBaselines(
      baseline.productVersionId,
    );
    const sorted = allBaselines
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const idx = sorted.findIndex(b => b.id === baseline.id);
    const previousBaseline = idx > 0 ? sorted[idx - 1] : undefined;

    const currentSnapshot = (baseline.snapshot ?? {}) as Record<string, unknown[]>;
    const previousSnapshot = (previousBaseline?.snapshot ?? {}) as Record<string, unknown[]>;

    const changes: SnapshotItemChange[] = [
      ...this.diffSnapshotItems(
        (previousSnapshot.components ?? []) as Record<string, unknown>[],
        (currentSnapshot.components ?? []) as Record<string, unknown>[],
        'component',
      ),
      ...this.diffSnapshotItems(
        (previousSnapshot.contracts ?? []) as Record<string, unknown>[],
        (currentSnapshot.contracts ?? []) as Record<string, unknown>[],
        'contract',
      ),
      ...this.diffSnapshotItems(
        (previousSnapshot.traceabilityLinks ?? []) as Record<string, unknown>[],
        (currentSnapshot.traceabilityLinks ?? []) as Record<string, unknown>[],
        'traceabilityLink',
      ),
    ];

    return {
      id: randomUUID(),
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

  private diffSnapshotItems(
    previous: Record<string, unknown>[],
    current: Record<string, unknown>[],
    itemType: SnapshotItemChange['itemType'],
  ): SnapshotItemChange[] {
    const prevMap = new Map<string, Record<string, unknown>>();
    const currMap = new Map<string, Record<string, unknown>>();

    for (const item of previous) {
      if (item.id) prevMap.set(String(item.id), item);
    }
    for (const item of current) {
      if (item.id) currMap.set(String(item.id), item);
    }

    const allIds = new Set([...prevMap.keys(), ...currMap.keys()]);
    const changes: SnapshotItemChange[] = [];

    for (const id of allIds) {
      const prev = prevMap.get(id);
      const curr = currMap.get(id);

      if (curr && !prev) {
        changes.push({ itemId: id, itemType, changeType: 'ADDED', current: curr });
      } else if (!curr && prev) {
        changes.push({ itemId: id, itemType, changeType: 'REMOVED', previous: prev });
      } else if (curr && prev) {
        const changedFields = Object.keys(curr).filter(
          key => JSON.stringify(curr[key]) !== JSON.stringify(prev[key]),
        );
        if (changedFields.length > 0) {
          changes.push({
            itemId: id,
            itemType,
            changeType: 'MODIFIED',
            previous: prev,
            current: curr,
            changedFields,
          });
        } else {
          changes.push({ itemId: id, itemType, changeType: 'UNCHANGED', previous: prev, current: curr });
        }
      }
    }

    return changes;
  }

  async getEntityAuditTrail(
    entityType: string,
    entityId: string,
  ): Promise<ComposerAuditEvent[]> {
    return this.repository.getEntityAuditTrail(entityType, entityId);
  }

  async getProductTraceability(productId: string): Promise<{
    productId: string;
    componentCount: number;
    coveredComponentCount: number;
    coverage: number;
    links: TraceabilityLink[];
  }> {
    const versions = await this.repository.listProductVersions(productId);
    const components: ProductComponent[] = [];
    for (const version of versions) {
      components.push(
        ...(await this.repository.listProductComponents(version.id)),
      );
    }
    const componentIds = new Set(components.map(c => c.id));
    const allLinks = await this.repository.listTraceabilityLinks();
    const links = allLinks.filter(
      link =>
        componentIds.has(link.targetId) || componentIds.has(link.sourceId),
    );
    const covered = new Set(
      links.map(link => link.targetId).filter(id => componentIds.has(id)),
    );
    return {
      productId,
      componentCount: components.length,
      coveredComponentCount: covered.size,
      coverage: components.length === 0 ? 0 : covered.size / components.length,
      links,
    };
  }

  async suggestComponents(
    productName: string,
    description: string,
    domain: string,
    existingSelections: string[],
    availableComponents: AvailableComponentSummary[],
    actor: string,
  ) {
    if (!this.llmClient) {
      throw new Error('AI suggestions are not enabled');
    }

    const context = {
      productName,
      description,
      domain,
      existingSelections,
      availableComponents,
    };

    const systemPrompt = buildSystemPrompt();
    const suggestions = await this.llmClient.suggestComponents(
      context,
      systemPrompt,
    );

    await this.audit('composition', 'ai-suggestion', 'AI_SUGGEST_COMPONENTS', actor, {
      newValue: JSON.stringify({ productName, suggestionCount: suggestions.length }),
    });

    return suggestions;
  }

  async generateProductSpec(
    ursBaselineId: string,
    actor: string,
  ): Promise<AISpecDraft> {
    if (!this.llmClient) {
      throw new Error('AI product spec generation is not enabled');
    }
    if (!this.ursBaselineResolver) {
      throw new Error('URS baseline resolver is not configured');
    }

    const ctx = await this.ursBaselineResolver.resolveBaselineContext(ursBaselineId);

    const catalogComponents = await this.loadCatalogComponents();

    const promptContext: ProductSpecContext = {
      businessNeed: ctx.businessNeed ?? ctx.solutionName ?? 'Unknown',
      solutionType: ctx.solutionType ?? 'data-product',
      solutionName: ctx.solutionName ?? 'Unnamed Solution',
      requirements: ctx.requirements,
      businessCapabilities: ctx.businessCapabilities,
      availableComponents: catalogComponents,
    };

    const result = await this.llmClient.generateProductSpec(promptContext);

    const draft: AISpecDraft = {
      id: randomUUID(),
      ursBaselineId,
      status: 'PENDING_REVIEW',
      productName: result.productName,
      description: result.description,
      domain: result.domain,
      suggestedComponents: result.components,
      suggestedContracts: result.contracts,
      generatedBy: actor,
      generatedAt: new Date().toISOString(),
    };

    this.specDrafts.set(draft.id, draft);

    await this.audit('AI_SPEC_DRAFT', draft.id, 'AI_PRODUCT_SPEC_GENERATED', actor, {
      newValue: JSON.stringify({
        ursBaselineId,
        productName: draft.productName,
        componentCount: draft.suggestedComponents.length,
        contractCount: draft.suggestedContracts.length,
      }),
    });

    return draft;
  }

  getSpecDraft(id: string): AISpecDraft | undefined {
    return this.specDrafts.get(id);
  }

  async applySpecDraft(
    draftId: string,
    actor: string,
  ): Promise<Product> {
    const draft = this.specDrafts.get(draftId);
    if (!draft) {
      throw new Error(`AI spec draft ${draftId} not found`);
    }
    if (draft.status !== 'PENDING_REVIEW') {
      throw new Error(`Cannot apply draft in status ${draft.status}`);
    }

    const product = await this.createProduct(
      {
        name: draft.productName,
        description: draft.description,
        productType: 'DATA_PRODUCT',
        domain: draft.domain,
      },
      actor,
    );

    const version = await this.createProductVersion(
      product.id,
      { changelog: `Generated from URS baseline ${draft.ursBaselineId} via AI spec draft ${draftId}` },
      actor,
    );

    for (const comp of draft.suggestedComponents) {
      await this.addProductComponent(
        version.id,
        {
          componentType: toComponentType(comp.componentType),
          name: comp.name,
          description: comp.reason,
        },
        actor,
      );
    }

    // The changelog above is prose. Record the origin machine-readably as well,
    // so the release gate's URS check can resolve it and traceability can be
    // reported on. The baseline stays DRAFT — approving it is a human act.
    await this.createProductBaseline(
      version.id,
      { ursBaselineIds: [draft.ursBaselineId] },
      actor,
    );

    draft.status = 'APPLIED';
    draft.appliedBy = actor;
    draft.appliedAt = new Date().toISOString();

    await this.audit('AI_SPEC_DRAFT', draftId, 'AI_SPEC_APPLIED', actor, {
      newValue: JSON.stringify({ productId: product.id, versionId: version.id }),
    });

    return product;
  }

  async rejectSpecDraft(
    draftId: string,
    actor: string,
  ): Promise<void> {
    const draft = this.specDrafts.get(draftId);
    if (!draft) {
      throw new Error(`AI spec draft ${draftId} not found`);
    }
    if (draft.status !== 'PENDING_REVIEW') {
      throw new Error(`Cannot reject draft in status ${draft.status}`);
    }

    draft.status = 'REJECTED';

    await this.audit('AI_SPEC_DRAFT', draftId, 'AI_SPEC_REJECTED', actor);
  }

  private async loadCatalogComponents(): Promise<AvailableComponentSummary[]> {
    // Placeholder — returns empty list when catalog is unavailable.
    // In production, this would call the Backstage Catalog API to fetch
    // platform component entities. The suggestComponents method already
    // receives components from the frontend, so this is a fallback for
    // the AI spec generation path where components aren't passed in.
    return [];
  }

  private async audit(
    entityType: string,
    entityId: string,
    eventType: string,
    actor: string,
    options?: { oldValue?: string; newValue?: string },
  ): Promise<void> {
    this.logger.info(
      `[composer] ${eventType} ${entityType}:${entityId} by ${actor}`,
    );
    const event: ComposerAuditEvent = {
      id: randomUUID(),
      entityType,
      entityId,
      eventType,
      actor,
      timestamp: new Date(),
      oldValue: options?.oldValue,
      newValue: options?.newValue,
    };
    await this.repository.createAuditEvent(event);
  }
}
