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
  ProductDependency,
  ContractSubscription,
  UpgradeNotification,
  TraceabilityLink,
  ProductBaseline,
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

  async updateProductVersion(version: ProductVersion): Promise<void> {
    await this.db('product_versions').where({ id: version.id }).update({
      status: version.status,
      changelog: version.changelog || null,
      parent_version_id: version.parentVersionId || null,
      release_commit_sha: version.releaseCommitSha || null,
      artifact_digest: version.artifactDigest || null,
      baseline_id: version.baselineId || null,
      approved_by: version.approvedBy || null,
      approved_at: version.approvedAt || null,
      revision: (version.revision || 1) + 1,
    });
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

  async getProductComponent(id: string): Promise<ProductComponent | undefined> {
    const row = await this.db('product_components').where({ id }).first();
    return row ? this.rowToProductComponent(row) : undefined;
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
      name: contract.name,
      owner: contract.owner || null,
      schema_type: contract.schemaType,
      schema_ref: contract.schemaRef || null,
      contract_spec: contract.contractSpec
        ? JSON.stringify(contract.contractSpec)
        : null,
      status: contract.status,
      version: contract.version,
      quality_rules:
        contract.qualityRules && contract.qualityRules.length > 0
          ? JSON.stringify(contract.qualityRules)
          : null,
      created_by: contract.createdBy,
      created_at: contract.createdAt,
      revision: contract.revision || 1,
    });
    return contract;
  }

  /**
   * Finds a contract on the same component with the same name (case-insensitive).
   *
   * Used by the service before insertion to produce a clear ConflictError
   * rather than relying on a database constraint violation message, which is
   * dialect-specific and harder to surface to clients cleanly.
   */
  async findDataContractByName(
    componentId: string,
    name: string,
  ): Promise<DataContract | undefined> {
    const row = await this.db('data_contracts')
      .where({ product_component_id: componentId })
      .whereRaw('lower(name) = lower(?)', [name])
      .first();
    return row ? this.rowToDataContract(row) : undefined;
  }

  async getDataContract(id: string): Promise<DataContract | undefined> {
    const row = await this.db('data_contracts').where({ id }).first();
    return row ? this.rowToDataContract(row) : undefined;
  }

  async listDataContracts(componentId: string): Promise<DataContract[]> {
    const rows = await this.db('data_contracts')
      .where({ product_component_id: componentId })
      .select();
    return rows.map((r: any) => this.rowToDataContract(r));
  }

  // ── Product Dependencies (Phase 4, P4-S3) ─────────────────────────────────

  async createProductDependency(dep: ProductDependency): Promise<ProductDependency> {
    await this.db('product_version_dependencies').insert({
      id: dep.id,
      product_version_id: dep.productVersionId,
      contract_id: dep.contractId,
      description: dep.description || null,
      created_by: dep.createdBy,
      created_at: dep.createdAt,
      revision: dep.revision || 1,
    });
    return dep;
  }

  async getProductDependency(id: string): Promise<ProductDependency | undefined> {
    const row = await this.db('product_version_dependencies').where({ id }).first();
    return row ? this.rowToProductDependency(row) : undefined;
  }

  async findProductDependency(
    versionId: string,
    contractId: string,
  ): Promise<ProductDependency | undefined> {
    const row = await this.db('product_version_dependencies')
      .where({ product_version_id: versionId, contract_id: contractId })
      .first();
    return row ? this.rowToProductDependency(row) : undefined;
  }

  async listProductDependencies(versionId: string): Promise<ProductDependency[]> {
    const rows = await this.db('product_version_dependencies')
      .where({ product_version_id: versionId })
      .select();
    return rows.map((r: any) => this.rowToProductDependency(r));
  }

  async deleteProductDependency(id: string): Promise<void> {
    await this.db('product_version_dependencies').where({ id }).delete();
  }

  /** All versions that declare a dependency on a specific contract. */
  async listDependenciesByContractId(contractId: string): Promise<ProductDependency[]> {
    const rows = await this.db('product_version_dependencies')
      .where({ contract_id: contractId })
      .select();
    return rows.map((r: any) => this.rowToProductDependency(r));
  }

  private rowToProductDependency(row: any): ProductDependency {
    return {
      id: row.id,
      productVersionId: row.product_version_id,
      contractId: row.contract_id,
      description: row.description ?? undefined,
      createdBy: row.created_by,
      createdAt: row.created_at,
      revision: row.revision,
    };
  }

  // ── Upgrade Notifications (W2-1) ──────────────────────────────────────────

  async createUpgradeNotification(n: UpgradeNotification): Promise<UpgradeNotification> {
    await this.db('upgrade_notifications').insert({
      id: n.id, type: n.type, subject_name: n.subjectName,
      new_version: n.newVersion, current_version: n.currentVersion ?? null,
      summary: n.summary, breaking: n.breaking ? 1 : 0,
      consumer_ref: n.consumerRef, read: 0, created_at: n.createdAt,
    });
    return n;
  }

  async listUpgradeNotifications(consumerRef: string, unreadOnly = false): Promise<UpgradeNotification[]> {
    let q = this.db('upgrade_notifications').where({ consumer_ref: consumerRef });
    if (unreadOnly) q = q.where({ read: 0 });
    const rows = await q.orderBy('created_at', 'desc').select();
    return rows.map((r: any) => ({
      id: r.id, type: r.type, subjectName: r.subject_name,
      newVersion: r.new_version, currentVersion: r.current_version ?? undefined,
      summary: r.summary, breaking: Boolean(r.breaking),
      consumerRef: r.consumer_ref, read: Boolean(r.read), createdAt: r.created_at,
    }));
  }

  async markNotificationRead(id: string): Promise<void> {
    await this.db('upgrade_notifications').where({ id }).update({ read: 1 });
  }

  // ── Contract Subscriptions (P-EXT-S4) ─────────────────────────────────────

  async createSubscription(sub: ContractSubscription): Promise<ContractSubscription> {
    await this.db('contract_subscriptions').insert({
      id: sub.id, contract_id: sub.contractId, consumer_ref: sub.consumerRef,
      consumer_label: sub.consumerLabel, compatible_versions: sub.compatibleVersions,
      status: sub.status, purpose: sub.purpose ?? null,
      created_by: sub.createdBy, created_at: sub.createdAt, revision: sub.revision || 1,
    });
    return sub;
  }

  async getSubscription(id: string): Promise<ContractSubscription | undefined> {
    const row = await this.db('contract_subscriptions').where({ id }).first();
    return row ? this.rowToSubscription(row) : undefined;
  }

  async findSubscription(contractId: string, consumerRef: string): Promise<ContractSubscription | undefined> {
    const row = await this.db('contract_subscriptions')
      .where({ contract_id: contractId, consumer_ref: consumerRef }).first();
    return row ? this.rowToSubscription(row) : undefined;
  }

  async listSubscriptionsByContract(contractId: string): Promise<ContractSubscription[]> {
    const rows = await this.db('contract_subscriptions').where({ contract_id: contractId }).select();
    return rows.map((r: any) => this.rowToSubscription(r));
  }

  async listSubscriptionsByConsumer(consumerRef: string): Promise<ContractSubscription[]> {
    const rows = await this.db('contract_subscriptions').where({ consumer_ref: consumerRef }).select();
    return rows.map((r: any) => this.rowToSubscription(r));
  }

  async updateSubscriptionStatus(id: string, status: ContractSubscription['status']): Promise<void> {
    await this.db('contract_subscriptions').where({ id }).update({ status, updated_at: new Date() });
  }

  private rowToSubscription(row: any): ContractSubscription {
    return {
      id: row.id, contractId: row.contract_id, consumerRef: row.consumer_ref,
      consumerLabel: row.consumer_label, compatibleVersions: row.compatible_versions,
      status: row.status as ContractSubscription['status'],
      purpose: row.purpose ?? undefined, createdBy: row.created_by,
      createdAt: row.created_at, updatedAt: row.updated_at ?? undefined,
      revision: row.revision,
    };
  }

  // ── Traceability Links ─────────────────────────────────────────────────────

  async createTraceabilityLink(
    link: TraceabilityLink,
  ): Promise<TraceabilityLink> {
    await this.db('traceability_links').insert({
      id: link.id,
      source_type: link.sourceType,
      source_id: link.sourceId,
      source_revision: link.sourceRevision ?? null,
      relationship_type: link.relationshipType,
      target_type: link.targetType,
      target_id: link.targetId,
      target_revision: link.targetRevision ?? null,
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
      old_value: event.oldValue || null,
      new_value: event.newValue || null,
    });
  }

  async getEntityAuditTrail(
    entityType: string,
    entityId: string,
  ): Promise<ComposerAuditEvent[]> {
    const rows = await this.db('composer_audit_events')
      .where({ entity_type: entityType, entity_id: entityId })
      .orderBy('timestamp', 'asc')
      .select();
    return rows.map((r: any) => this.rowToAuditEvent(r));
  }

  async createProductBaseline(baseline: ProductBaseline): Promise<ProductBaseline> {
    await this.db('product_baselines').insert({
      id: baseline.id,
      product_version_id: baseline.productVersionId,
      baseline_version: baseline.baselineVersion,
      status: baseline.status,
      snapshot: JSON.stringify(baseline.snapshot),
      urs_baseline_ids: baseline.ursBaselineIds
        ? JSON.stringify(baseline.ursBaselineIds)
        : null,
      created_by: baseline.createdBy,
      created_at: baseline.createdAt,
      revision: baseline.revision || 1,
    });
    return baseline;
  }

  async getProductBaseline(id: string): Promise<ProductBaseline | null> {
    const row = await this.db('product_baselines').where({ id }).first();
    return row ? this.rowToProductBaseline(row) : null;
  }

  async listProductBaselines(productVersionId: string): Promise<ProductBaseline[]> {
    const rows = await this.db('product_baselines')
      .where({ product_version_id: productVersionId })
      .orderBy('created_at', 'desc')
      .select();
    return rows.map((r: any) => this.rowToProductBaseline(r));
  }

  async updateProductBaseline(baseline: ProductBaseline): Promise<void> {
    await this.db('product_baselines').where({ id: baseline.id }).update({
      status: baseline.status,
      approved_by: baseline.approvedBy || null,
      approved_at: baseline.approvedAt || null,
      superseded_by: baseline.supersededBy || null,
      revision: (baseline.revision || 1) + 1,
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
      parentVersionId: row.parent_version_id || undefined,
      releaseCommitSha: row.release_commit_sha || undefined,
      artifactDigest: row.artifact_digest || undefined,
      baselineId: row.baseline_id || undefined,
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
      name: row.name ?? '',
      owner: row.owner ?? undefined,
      schemaType: row.schema_type,
      schemaRef: row.schema_ref,
      contractSpec: row.contract_spec ? JSON.parse(row.contract_spec) : undefined,
      status: row.status,
      version: row.version,
      qualityRules: row.quality_rules ? JSON.parse(row.quality_rules) : [],
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
      sourceRevision: row.source_revision ?? undefined,
      relationshipType: row.relationship_type,
      targetType: row.target_type,
      targetId: row.target_id,
      targetRevision: row.target_revision ?? undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdBy: row.created_by,
      createdAt: row.created_at,
    };
  }

  private rowToAuditEvent(row: any): ComposerAuditEvent {
    return {
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      eventType: row.event_type,
      actor: row.actor,
      timestamp: row.timestamp,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      oldValue: row.old_value || undefined,
      newValue: row.new_value || undefined,
    };
  }

  private rowToProductBaseline(row: any): ProductBaseline {
    return {
      id: row.id,
      productVersionId: row.product_version_id,
      baselineVersion: row.baseline_version,
      status: row.status,
      snapshot: JSON.parse(row.snapshot),
      ursBaselineIds: row.urs_baseline_ids
        ? JSON.parse(row.urs_baseline_ids)
        : undefined,
      createdBy: row.created_by,
      createdAt: row.created_at,
      approvedBy: row.approved_by || undefined,
      approvedAt: row.approved_at || undefined,
      supersededBy: row.superseded_by || undefined,
      revision: row.revision,
    };
  }
}
