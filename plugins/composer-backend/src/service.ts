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
  ProductComponent,
  ProductVersion,
  TraceabilityLink,
  validateProduct,
  validateTraceabilityLink,
} from '@internal/platform-common';
import { IComposerRepository, ComposerAuditEvent } from './repository-interface';
import {
  CreateDataContractRequest,
  CreateProductComponentRequest,
  CreateProductRequest,
  CreateProductVersionRequest,
  CreateTraceabilityLinkRequest,
  DataContract,
} from './types';

export interface ComposerServiceOptions {
  logger: LoggerService;
  repository: IComposerRepository;
}

export class ComposerService {
  private readonly logger: LoggerService;
  private readonly repository: IComposerRepository;

  constructor(options: ComposerServiceOptions) {
    this.logger = options.logger;
    this.repository = options.repository;
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
      relationshipType:
        request.relationshipType as TraceabilityLink['relationshipType'],
      targetType: request.targetType,
      targetId: request.targetId,
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
    };
    await this.repository.createAuditEvent(event);
  }
}
