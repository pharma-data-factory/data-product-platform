/**
 * Product Composer service layer.
 *
 * Owns Product/Version/Component/Contract CRUD plus traceability links.
 * Writes an append-only audit event for each mutation (ALCOA-aligned).
 */

import { LoggerService } from '@backstage/backend-plugin-api';
import { randomUUID } from 'crypto';
import {
  DataClassification,
  InterfaceType,
  Product,
  ProductBaseline,
  ProductComponent,
  ProductVersion,
  TraceabilityLink,
  validateProduct,
  validateTraceabilityLink,
} from '@internal/platform-common';
import { IComposerRepository, ComposerAuditEvent } from './repository-interface';
import {
  CreateDataContractRequest,
  CreateProductBaselineRequest,
  CreateProductComponentRequest,
  CreateProductRequest,
  CreateProductVersionRequest,
  CreateTraceabilityLinkRequest,
  DataContract,
  TransitionProductVersionRequest,
} from './types';
import type { UrsBaselineResolver } from './urs-baseline-resolver';

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
}

export class ComposerService {
  private readonly logger: LoggerService;
  private readonly repository: IComposerRepository;
  private readonly ursBaselineResolver?: UrsBaselineResolver;

  constructor(options: ComposerServiceOptions) {
    this.logger = options.logger;
    this.repository = options.repository;
    this.ursBaselineResolver = options.ursBaselineResolver;
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
    const versionNumber = versions.length + 1;
    const version: ProductVersion = {
      id: randomUUID(),
      productId,
      version: request.version ?? `${versionNumber}.0`,
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

    // Cross-plugin: verify referenced URS baselines are APPROVED
    if (
      this.ursBaselineResolver &&
      approvedBaseline?.ursBaselineIds &&
      approvedBaseline.ursBaselineIds.length > 0
    ) {
      for (const ursId of approvedBaseline.ursBaselineIds) {
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
