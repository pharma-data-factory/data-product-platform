/**
 * Knex-backed Product Composer repository.
 *
 * All queries use parameterized statements. JSON-shaped fields (consumers,
 * slo, cost_info, config, contract_spec, metadata) are stored as text, matching
 * the URS Composer persistence convention.
 */

import { Knex } from 'knex';
import {
  Product,
  ProductVersion,
  ProductComponent,
  DataContract,
  TraceabilityLink,
} from './types';
import { IComposerRepository, ComposerAuditEvent } from './repository-interface';
import { up } from './db/migrations';

export class ComposerRepository implements IComposerRepository {
  private readonly db: Knex;

  private constructor(db: Knex) {
    this.db = db;
  }

  static async create(database: {
    getClient(): Promise<Knex> | Knex;
  }): Promise<ComposerRepository> {
    const db = await database.getClient();
    await up(db);
    return new ComposerRepository(db);
  }

  async createProduct(product: Product): Promise<Product> {
    await this.db('products').insert({
      id: product.id,
      name: product.name,
      description: product.description || null,
      business_purpose: product.businessPurpose || null,
      product_type: product.productType,
      domain: product.domain || null,
      subdomain: product.subdomain || null,
      owner: product.owner || null,
      team: product.team || null,
      lifecycle: product.lifecycle,
      status: product.status,
      criticality: product.criticality || null,
      gxp_relevance: product.gxpRelevance || null,
      data_classification: product.dataClassification || null,
      consumers: product.consumers ? JSON.stringify(product.consumers) : null,
      slo: product.slo ? JSON.stringify(product.slo) : null,
      cost_info: product.costInfo ? JSON.stringify(product.costInfo) : null,
      created_by: product.createdBy,
      created_at: product.createdAt,
      revision: product.revision || 1,
    });
    return product;
  }

  async getProduct(id: string): Promise<Product | null> {
    const row = await this.db('products').where({ id }).first();
    return row ? this.rowToProduct(row) : null;
  }

  async listProducts(
    limit: number,
    offset: number,
  ): Promise<{ items: Product[]; total: number }> {
    const countResult = await this.db('products').count('* as count').first();
    const total = Number(countResult?.count || 0);
    const rows = await this.db('products')
      .limit(limit)
      .offset(offset)
      .select();
    return { items: rows.map((r: any) => this.rowToProduct(r)), total };
  }

  async updateProduct(product: Product): Promise<void> {
    await this.db('products').where({ id: product.id }).update({
      name: product.name,
      description: product.description || null,
      business_purpose: product.businessPurpose || null,
      product_type: product.productType,
      domain: product.domain || null,
      subdomain: product.subdomain || null,
      owner: product.owner || null,
      team: product.team || null,
      lifecycle: product.lifecycle,
      status: product.status,
      criticality: product.criticality || null,
      gxp_relevance: product.gxpRelevance || null,
      data_classification: product.dataClassification || null,
      consumers: product.consumers ? JSON.stringify(product.consumers) : null,
      slo: product.slo ? JSON.stringify(product.slo) : null,
      cost_info: product.costInfo ? JSON.stringify(product.costInfo) : null,
      updated_by: product.updatedBy || null,
      updated_at: product.updatedAt || new Date(),
      revision: (product.revision || 1) + 1,
    });
  }

  async createProductVersion(version: ProductVersion): Promise<ProductVersion> {
    await this.db('product_versions').insert({
      id: version.id,
      product_id: version.productId,
      version: version.version,
      version_number: version.versionNumber,
      status: version.status,
      changelog: version.changelog || null,
      created_by: version.createdBy,
      created_at: version.createdAt,
      revision: version.revision || 1,
    });
    return version;
  }

  async getProductVersion(id: string): Promise<ProductVersion | null> {
    const row = await this.db('product_versions').where({ id }).first();
    return row ? this.rowToProductVersion(row) : null;
  }

  async listProductVersions(productId: string): Promise<ProductVersion[]> {
    const rows = await this.db('product_versions')
      .where({ product_id: productId })
      .orderBy('version_number', 'asc')
      .select();
    return rows.map((r: any) => this.rowToProductVersion(r));
  }

  async createProductComponent(
    component: ProductComponent,
  ): Promise<ProductComponent> {
    await this.db('product_components').insert({
      id: component.id,
      product_version_id: component.productVersionId,
      component_type: component.componentType,
      name: component.name,
      description: component.description || null,
      ref: component.ref || null,
      interface_type: component.interfaceType || null,
      source_system: component.sourceSystem || null,
      target_system: component.targetSystem || null,
      config: component.config ? JSON.stringify(component.config) : null,
      created_by: component.createdBy,
      created_at: component.createdAt,
      revision: component.revision || 1,
    });
    return component;
  }

  async listProductComponents(versionId: string): Promise<ProductComponent[]> {
    const rows = await this.db('product_components')
      .where({ product_version_id: versionId })
      .select();
    return rows.map((r: any) => this.rowToProductComponent(r));
  }

  async createDataContract(contract: DataContract): Promise<DataContract> {
    await this.db('data_contracts').insert({
      id: contract.id,
      product_component_id: contract.productComponentId,
      schema_type: contract.schemaType,
      schema_ref: contract.schemaRef || null,
      contract_spec: contract.contractSpec
        ? JSON.stringify(contract.contractSpec)
        : null,
      status: contract.status,
      version: contract.version,
      created_by: contract.createdBy,
      created_at: contract.createdAt,
      revision: contract.revision || 1,
    });
    return contract;
  }

  async listDataContracts(componentId: string): Promise<DataContract[]> {
    const rows = await this.db('data_contracts')
      .where({ product_component_id: componentId })
      .select();
    return rows.map((r: any) => this.rowToDataContract(r));
  }

  async createTraceabilityLink(
    link: TraceabilityLink,
  ): Promise<TraceabilityLink> {
    await this.db('traceability_links').insert({
      id: link.id,
      source_type: link.sourceType,
      source_id: link.sourceId,
      relationship_type: link.relationshipType,
      target_type: link.targetType,
      target_id: link.targetId,
      metadata: link.metadata ? JSON.stringify(link.metadata) : null,
      created_by: link.createdBy,
      created_at: link.createdAt,
    });
    return link;
  }

  async deleteTraceabilityLink(id: string): Promise<void> {
    await this.db('traceability_links').where({ id }).del();
  }

  async listTraceabilityLinks(): Promise<TraceabilityLink[]> {
    const rows = await this.db('traceability_links').select();
    return rows.map((r: any) => this.rowToTraceabilityLink(r));
  }

  async createAuditEvent(event: ComposerAuditEvent): Promise<void> {
    await this.db('composer_audit_events').insert({
      id: event.id,
      entity_type: event.entityType,
      entity_id: event.entityId,
      event_type: event.eventType,
      metadata: event.metadata ? JSON.stringify(event.metadata) : null,
      actor: event.actor,
      timestamp: event.timestamp,
    });
  }

  private rowToProduct(row: any): Product {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      businessPurpose: row.business_purpose,
      productType: row.product_type,
      domain: row.domain,
      subdomain: row.subdomain,
      owner: row.owner,
      team: row.team,
      lifecycle: row.lifecycle,
      status: row.status,
      criticality: row.criticality,
      gxpRelevance: row.gxp_relevance,
      dataClassification: row.data_classification,
      consumers: row.consumers ? JSON.parse(row.consumers) : undefined,
      slo: row.slo ? JSON.parse(row.slo) : undefined,
      costInfo: row.cost_info ? JSON.parse(row.cost_info) : undefined,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedBy: row.updated_by,
      updatedAt: row.updated_at,
      revision: row.revision,
    };
  }

  private rowToProductVersion(row: any): ProductVersion {
    return {
      id: row.id,
      productId: row.product_id,
      version: row.version,
      versionNumber: row.version_number,
      status: row.status,
      changelog: row.changelog,
      createdBy: row.created_by,
      createdAt: row.created_at,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      revision: row.revision,
    };
  }

  private rowToProductComponent(row: any): ProductComponent {
    return {
      id: row.id,
      productVersionId: row.product_version_id,
      componentType: row.component_type,
      name: row.name,
      description: row.description,
      ref: row.ref,
      interfaceType: row.interface_type,
      sourceSystem: row.source_system,
      targetSystem: row.target_system,
      config: row.config ? JSON.parse(row.config) : undefined,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedBy: row.updated_by,
      updatedAt: row.updated_at,
      revision: row.revision,
    };
  }

  private rowToDataContract(row: any): DataContract {
    return {
      id: row.id,
      productComponentId: row.product_component_id,
      schemaType: row.schema_type,
      schemaRef: row.schema_ref,
      contractSpec: row.contract_spec ? JSON.parse(row.contract_spec) : undefined,
      status: row.status,
      version: row.version,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedBy: row.updated_by,
      updatedAt: row.updated_at,
      revision: row.revision,
    };
  }

  private rowToTraceabilityLink(row: any): TraceabilityLink {
    return {
      id: row.id,
      sourceType: row.source_type,
      sourceId: row.source_id,
      relationshipType: row.relationship_type,
      targetType: row.target_type,
      targetId: row.target_id,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdBy: row.created_by,
      createdAt: row.created_at,
    };
  }
}
