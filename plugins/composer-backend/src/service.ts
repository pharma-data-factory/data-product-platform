/**
 * Product Composer service layer.
 *
 * Owns Product/Version/Component/Contract CRUD plus traceability links.
 * Writes an append-only audit event for each mutation (ALCOA-aligned).
 */

import { LoggerService } from '@backstage/backend-plugin-api';
import { ConflictError, InputError, NotFoundError } from '@backstage/errors';
import { createHash, randomUUID } from 'crypto';
import {
  ContractSubscription,
  DataClassification,
  UpgradeNotification,
  InterfaceType,
  Product,
  ProductBaseline,
  ProductBaselineDelta,
  ProductComponent,
  ProductDependency,
  ProductVersion,
  QualityRule,
  SUBSCRIPTION_STATUSES,
  SnapshotItemChange,
  TraceabilityLink,
  contractRef,
  validateContractExchange,
  findVersionLabelClash,
  parseContractRef,
  isQualityRuleType,
  nextMajorVersionLabel,
  isDataContractSchemaType,
  validateBaselineLabel,
  validateDataContractSchemaType,
  validateProduct,
  validateNameSegment,
  validateVersionLabel,
  validateTraceabilityLink,
  evaluateContractCompatibility,
  type ContractCompatReport,
  type ContractExchange,
  type JsonSchemaLike,
} from '@internal/platform-common';
import { IComposerRepository, ComposerAuditEvent } from './repository-interface';
import { evaluatePlatformPolicy } from './platform-policy';
import {
  CreateDataContractRequest,
  CreateProductDependencyRequest,
  CreateSubscriptionRequest,
  DataLineage,
  LineageUpstreamEntry,
  LineageDownstreamEntry,
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
import type { CatalogComponentLoader } from './catalog-component-loader';
import type { PolicyResolverClient } from './policy-resolver-client';

/**
 * Cross-plugin resolver: checks whether a ValidationContext for a given URS
 * baseline has an APPROVED ValidationDecision.
 *
 * The composer-backend never reads validation-expert tables directly. It
 * resolves through the validation-expert public API, following the same
 * pattern as the URS baseline resolver. In tests this is backed by a stub.
 *
 * Phase 5 (P5-S1).
 */
export interface ValidationDecisionResolver {
  /**
   * Returns true when the ValidationContext for `baselineId` has an APPROVED
   * ValidationDecision. Returns false when no context or no decision exists,
   * or when the decision status is CONDITIONAL or REJECTED.
   */
  hasApprovedDecision(baselineId: string): Promise<boolean>;
}
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

/**
 * Page size `getArtifactChangeImpact` reads the product table with. Impact
 * analysis is only correct if it sees every product, so this has to exceed the
 * real product count; it is a bound against an unbounded scan, not a page the
 * caller can walk.
 */
const ARTIFACT_IMPACT_SCAN_LIMIT = 10_000;

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
  /** Loads Platform Component entities for AI spec generation context. */
  catalogLoader?: CatalogComponentLoader;
  /**
   * Checks whether a ValidationDecision exists and is APPROVED for a URS
   * baseline. Used by the release gate. Phase 5 (P5-S1).
   */
  validationDecisionResolver?: ValidationDecisionResolver;
  /**
   * Resolves Policy Pack coordinates against the Artifact Registry.
   * Used by the release gate to check product-declared policy obligations (5-R1).
   */
  policyResolverClient?: PolicyResolverClient;
  /**
   * Shared SSE client registry. Injected by the router so upgrade notifications
   * can push events to connected consumers without any property bag tricks.
   */
  sseClients?: Map<string, Set<{ write(s: string): void }>>;
}

export class ComposerService {
  private readonly logger: LoggerService;
  private readonly repository: IComposerRepository;
  private readonly ursBaselineResolver?: UrsBaselineResolver;
  private readonly llmClient?: ComposerLLMClient;
  private readonly catalogLoader?: CatalogComponentLoader;
  private readonly validationDecisionResolver?: ValidationDecisionResolver;
  private readonly policyResolverClient?: PolicyResolverClient;
  readonly sseClients: Map<string, Set<{ write(s: string): void }>>;
  private readonly specDrafts = new Map<string, AISpecDraft>();

  constructor(options: ComposerServiceOptions) {
    this.logger = options.logger;
    this.repository = options.repository;
    this.ursBaselineResolver = options.ursBaselineResolver;
    this.llmClient = options.llmClient;
    this.catalogLoader = options.catalogLoader;
    this.validationDecisionResolver = options.validationDecisionResolver;
    this.policyResolverClient = options.policyResolverClient;
    this.sseClients = options.sseClients ?? new Map();
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
      // Was missing: CreateProductRequest declares it and the products table
      // has the column, but the mapping was never written, so every product
      // created through the API stored NULL. checkReleaseGate only resolves
      // Policy Packs when declaredPolicies is non-empty, which meant the whole
      // 5-R1 mechanism was inert for API-created products — the gate resolved
      // nothing and reported no obligations, silently.
      declaredPolicies: request.declaredPolicies,
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
        ? nextMajorVersionLabel(versions.map(existing => existing.version))
        : String(supplied).trim();

    const labelIssues = validateVersionLabel(label);
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

  async getDataContract(id: string): Promise<DataContract | undefined> {
    return this.repository.getDataContract(id);
  }

  async listDataContracts(componentId: string): Promise<DataContract[]> {
    return this.repository.listDataContracts(componentId);
  }

  async addDataContract(
    componentId: string,
    request: CreateDataContractRequest,
    actor: string,
  ): Promise<DataContract> {
    // Slice 1 of the phase-closure plan: a contract is identified by
    // namespace/name@version, not by the component that declares it. Both
    // segments follow the same grammar as an Artifact coordinate so a
    // contract ref reads like every other reference on the platform.
    const name = String(request.name ?? '').trim();
    const nameIssues = validateNameSegment(name, 'DataContract name');
    if (nameIssues.length > 0) {
      throw new InputError(
        `${nameIssues.join('; ')}. The name is half of the contract's ` +
          'coordinate, which consumers in other Products write down — ' +
          'e.g. "output-event".',
      );
    }

    const namespace = String(request.namespace ?? '').trim();
    const namespaceIssues = validateNameSegment(
      namespace,
      'DataContract namespace',
    );
    if (namespaceIssues.length > 0) {
      throw new InputError(
        `${namespaceIssues.join('; ')}. The namespace is what makes this ` +
          'contract addressable outside its own Product.',
      );
    }

    // Narrowing with the guard rather than casting: the cast that used to be
    // here is what let any string through as a schemaType in the first place,
    // producing stored values the type said could not exist.
    const schemaType = String(request.schemaType ?? '').trim();
    if (!isDataContractSchemaType(schemaType)) {
      throw new InputError(
        validateDataContractSchemaType(schemaType).join('; '),
      );
    }

    // A contract version is a semantic version, so it follows the same rules
    // as a Product version label rather than being free text. As with
    // ProductVersion, an absent value is defaulted and a present-but-blank one
    // is a malformed request.
    const suppliedVersion = request.version;
    const version =
      suppliedVersion === undefined || suppliedVersion === null
        ? '1.0'
        : String(suppliedVersion).trim();
    const versionIssues = validateVersionLabel(version);
    if (versionIssues.length > 0) {
      throw new InputError(versionIssues.join('; '));
    }

    // Uniqueness is checked once the whole coordinate is known, because the
    // version is part of it: `orders@1.0` and `orders@2.0` are two contracts,
    // not a collision. The database index enforces the same rule and closes
    // the race two concurrent creates would otherwise win; this check exists
    // to return a readable error rather than a dialect-specific constraint
    // violation.
    const coordinate = { namespace, name, version };
    const clash = await this.repository.findDataContractByCoordinate(coordinate);
    if (clash) {
      throw new ConflictError(
        `A DataContract already exists at ${contractRef(coordinate)} ` +
          `(id ${clash.id}, provided by component ${clash.productComponentId}). ` +
          'A coordinate names exactly one contract — choose a different name, ' +
          'or publish this as a new version.',
      );
    }

    // Phase 4 (P4-S6): validate quality rules.
    const qualityRules: QualityRule[] = [];
    for (const rule of request.qualityRules ?? []) {
      if (!rule.name || !String(rule.name).trim()) {
        throw new InputError('Each qualityRule must have a non-empty name');
      }
      if (!isQualityRuleType(rule.rule)) {
        throw new InputError(
          `Unknown quality rule type "${rule.rule}". Supported: ${['completeness', 'uniqueness', 'range', 'regex'].join(', ')}`,
        );
      }
      if (!rule.field || !String(rule.field).trim()) {
        throw new InputError(`Quality rule "${rule.name}" must specify a field`);
      }
      qualityRules.push({
        name: String(rule.name).trim(),
        rule: rule.rule,
        field: String(rule.field).trim(),
        params: rule.params,
        mandatory: rule.mandatory !== false,
      });
    }

    // Provider-neutral exchange (Slice 2). Validated for shape only — an
    // unknown deliveryMechanism is accepted on purpose, because the strategy
    // makes exchange technologies providers rather than Core domain truth.
    let exchange: ContractExchange | undefined;
    if (request.exchange) {
      const exchangeIssues = validateContractExchange(request.exchange);
      if (exchangeIssues.length > 0) {
        throw new InputError(exchangeIssues.join('; '));
      }
      exchange = {
        ...request.exchange,
        deliveryMechanism: String(request.exchange.deliveryMechanism).trim(),
        accessMode: request.exchange.accessMode ?? 'REQUEST',
      };
    }

    const contract: DataContract = {
      id: randomUUID(),
      productComponentId: componentId,
      namespace,
      name,
      owner: request.owner ? String(request.owner).trim() || undefined : undefined,
      schemaType,
      schemaRef: request.schemaRef,
      contractSpec: request.contractSpec,
      status: 'DRAFT',
      version,
      qualityRules,
      exchange,
      createdBy: actor,
      createdAt: new Date(),
      revision: 1,
    };
    await this.repository.createDataContract(contract);
    await this.audit('DATA_CONTRACT', contract.id, 'DATA_CONTRACT_CREATED', actor);
    return contract;
  }

  /**
   * Resolves a contract from its coordinate alone.
   *
   * This is what the coordinate is for. A consumer in another Product holds
   * `namespace/name@version` and nothing else — not the contract's id, not the
   * component that provides it, not even which Product that component belongs
   * to. Before Slice 1 this lookup was impossible: the only way in was the
   * component.
   *
   * A malformed ref is rejected rather than treated as "not found", so a typo
   * in a coordinate does not look the same as a contract that was retired.
   */
  async getDataContractByRef(ref: string): Promise<DataContract> {
    const coordinate = parseContractRef(ref);
    if (!coordinate) {
      throw new InputError(
        `"${ref}" is not a contract coordinate. Expected ` +
          'namespace/name@version, e.g. "sales/order-events@1.0".',
      );
    }
    const contract = await this.repository.findDataContractByCoordinate(
      coordinate,
    );
    if (!contract) {
      throw new NotFoundError(
        `No DataContract at ${contractRef(coordinate)}.`,
      );
    }
    return contract;
  }

  // ── Product Dependencies (Phase 4, P4-S3) ─────────────────────────────────

  async addProductDependency(
    versionId: string,
    request: CreateProductDependencyRequest,
    actor: string,
  ): Promise<ProductDependency> {
    const contractId = String(request.contractId ?? '').trim();
    if (!contractId) {
      throw new InputError('productDependency.contractId is required');
    }
    // Validate that the referenced contract exists.
    const contract = await this.repository.getDataContract(contractId);
    if (!contract) {
      throw new InputError(
        `DataContract ${contractId} not found. A ProductDependency must reference an existing contract.`,
      );
    }
    // Uniqueness: a version may only declare one dependency per contract.
    const existing = await this.repository.findProductDependency(versionId, contractId);
    if (existing) {
      throw new ConflictError(
        `Version ${versionId} already declares a dependency on contract ${contractId}.`,
      );
    }
    const dep: ProductDependency = {
      id: randomUUID(),
      productVersionId: versionId,
      contractId,
      description: request.description ? String(request.description).trim() || undefined : undefined,
      createdBy: actor,
      createdAt: new Date(),
      revision: 1,
    };
    await this.repository.createProductDependency(dep);
    await this.audit('PRODUCT_DEPENDENCY', dep.id, 'PRODUCT_DEPENDENCY_ADDED', actor, {
      newValue: JSON.stringify({ versionId, contractId }),
    });
    return dep;
  }

  async listProductDependencies(versionId: string): Promise<ProductDependency[]> {
    return this.repository.listProductDependencies(versionId);
  }

  async removeProductDependency(id: string, actor: string): Promise<void> {
    const dep = await this.repository.getProductDependency(id);
    if (!dep) {
      throw new InputError(`ProductDependency ${id} not found`);
    }
    await this.repository.deleteProductDependency(id);
    await this.audit('PRODUCT_DEPENDENCY', id, 'PRODUCT_DEPENDENCY_REMOVED', actor);
  }

  /**
   * One-hop data lineage for a product version.
   *
   * Upstream: contracts this version consumes via ProductDependency.
   *   Traces each dependency: DataContract → ProductComponent → ProductVersion
   *   → Product to find who produces the data.
   *
   * Downstream: contracts this version's components produce, and which other
   *   versions declare a dependency on each of those contracts.
   *
   * Entries where a referenced entity no longer exists are silently skipped
   * (orphaned contract, deleted version/product) rather than raising — the
   * lineage is computed from live data and a missing hop does not make the
   * rest of the graph wrong.
   */
  /**
   * Checks whether updating from one contract to another is compatible.
   *
   * Compares the `contractSpec` of both contracts using the platform's JSON
   * Schema compatibility rules (`evaluateContractCompatibility`). Returns
   * UNKNOWN if either contract lacks a spec or the spec is empty.
   *
   * Both contracts must exist. The order matters: previousId is the current
   * deployed version, nextId is the proposed replacement.
   */
  async checkContractCompatibility(
    previousId: string,
    nextId: string,
  ): Promise<ContractCompatReport & { previousContractId: string; nextContractId: string }> {
    const previous = await this.repository.getDataContract(previousId);
    if (!previous) {
      throw new InputError(`DataContract ${previousId} not found`);
    }
    const next = await this.repository.getDataContract(nextId);
    if (!next) {
      throw new InputError(`DataContract ${nextId} not found`);
    }
    const report = evaluateContractCompatibility(
      (previous.contractSpec ?? {}) as JsonSchemaLike,
      (next.contractSpec ?? {}) as JsonSchemaLike,
    );
    return { ...report, previousContractId: previousId, nextContractId: nextId };
  }

  async getDataLineage(versionId: string): Promise<DataLineage> {
    // ── Upstream ────────────────────────────────────────────────────────────
    const deps = await this.repository.listProductDependencies(versionId);
    const upstream: LineageUpstreamEntry[] = [];
    for (const dep of deps) {
      const contract = await this.repository.getDataContract(dep.contractId);
      if (!contract) continue;
      const component = await this.repository.getProductComponent(contract.productComponentId);
      if (!component) continue;
      const producerVersion = await this.repository.getProductVersion(component.productVersionId);
      if (!producerVersion) continue;
      const producerProduct = await this.repository.getProduct(producerVersion.productId);
      if (!producerProduct) continue;
      upstream.push({
        dependencyId: dep.id,
        contractId: dep.contractId,
        contractName: contract.name,
        producerComponentId: component.id,
        producerVersionId: producerVersion.id,
        producerProductId: producerProduct.id,
        producerProductName: producerProduct.name,
      });
    }

    // ── Downstream ──────────────────────────────────────────────────────────
    const components = await this.repository.listProductComponents(versionId);
    const downstream: LineageDownstreamEntry[] = [];
    for (const comp of components) {
      const contracts = await this.repository.listDataContracts(comp.id);
      for (const contract of contracts) {
        const consumers = await this.repository.listDependenciesByContractId(contract.id);
        for (const consumer of consumers) {
          // Skip self-references (version depending on its own contract).
          if (consumer.productVersionId === versionId) continue;
          const consumerVersion = await this.repository.getProductVersion(consumer.productVersionId);
          if (!consumerVersion) continue;
          const consumerProduct = await this.repository.getProduct(consumerVersion.productId);
          if (!consumerProduct) continue;
          downstream.push({
            contractId: contract.id,
            contractName: contract.name,
            consumerVersionId: consumerVersion.id,
            consumerProductId: consumerProduct.id,
            consumerProductName: consumerProduct.name,
          });
        }
      }
    }

    return { versionId, upstream, downstream };
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

    // Phase 5 (P5-S2): Segregation of Duties on APPROVED transition.
    // The person who approves a version must not be the same person who
    // created it. Approval by the author of a version is self-approval and
    // is not admissible in a GxP context.
    if (request.targetStatus === 'APPROVED' && actor === version.createdBy) {
      throw new InputError(
        `Segregation of Duties violation: the author of a product version ` +
          `cannot approve it. Actor "${actor}" created version ${versionId}. ` +
          `A different person must perform the approval.`,
      );
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

    // 5-R1: Check product-declared Policy Pack obligations.
    // A product with declaredPolicies must satisfy all obligations from those
    // POLICY_PACK Artifacts before it can be released.
    if (this.policyResolverClient && product && (product.declaredPolicies ?? []).length > 0) {
      const resolution = await this.policyResolverClient.resolvePolicies(
        product.declaredPolicies ?? [],
      );
      if (resolution) {
        for (const unresolved of resolution.unresolved) {
          blockers.push({
            code: 'POLICY_PACK_UNRESOLVABLE',
            message: `Policy Pack "${unresolved}" could not be found in the registry. Register it before releasing.`,
          });
        }
        // Evaluate each obligation's `check` identifier against the product's
        // actual data. Unknown check IDs fail loudly (same rule as platform-policy.ts).
        const isGxp = product.gxpRelevance && product.gxpRelevance !== 'NONE';
        // Reuses the `components` already loaded above for the NO_COMPONENTS
        // check — same version, same query.
        const contractList: DataContract[] = [];
        for (const comp of components) {
          contractList.push(...(await this.repository.listDataContracts(comp.id)));
        }
        const deps = await this.repository.listProductDependencies(versionId);

        const policyChecks: Record<string, () => boolean> = {
          'product-owner-set': () => Boolean(product.owner?.trim()),
          'data-classification-set': () => Boolean(product.dataClassification),
          'gxp-relevance-set': () => Boolean(product.gxpRelevance),
          'criticality-set': () => Boolean(product.criticality),
          'urs-baseline-bound': () => Boolean(approvedBaseline?.ursBaselineIds?.length),
          'validation-decision-approved': () => false, // evaluated separately by validationDecisionResolver
          'output-contracts-declared': () => contractList.length > 0,
          // Phase 4 closure (Slice 2). A released contract that does not say
          // how it is delivered cannot actually be consumed — the coordinate
          // names it, the exchange definition is what makes it reachable.
          // Every contract must declare one, not just some: a single silent
          // contract is the one a consumer will trip over.
          'exchange-declared': () =>
            contractList.length > 0 &&
            contractList.every(c => Boolean(c.exchange?.deliveryMechanism)),
          'quality-checks-declared': () => contractList.some(c => (c.qualityRules ?? []).length > 0),
          'product-dependencies-declared': () => deps.length > 0,
        };

        for (const obl of resolution.obligations) {
          const appliesToThis =
            obl.appliesTo === 'all' ||
            (obl.appliesTo === 'gxp' && isGxp) ||
            (obl.appliesTo === 'commercial' && Boolean(product.declaredPolicies?.length));

          if (!appliesToThis) continue;

          const checkFn = policyChecks[obl.check];
          if (!checkFn) {
            // Unknown check — fail loudly per policy principle
            blockers.push({
              code: 'POLICY_OBLIGATION_UNMET',
              message: `[${obl.policyRef}] Unknown policy check "${obl.check}" — update the platform or the policy pack.`,
            });
            continue;
          }

          // Skip validation-decision-approved here: handled by validationDecisionResolver above
          if (obl.check === 'validation-decision-approved') continue;

          if (!checkFn()) {
            blockers.push({
              code: 'POLICY_OBLIGATION_UNMET',
              message: `[${obl.policyRef}] ${obl.title}: ${obl.message}`,
            });
          }
        }
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

    // Phase 5 (P5-S1): A GxP-relevant product must have an APPROVED
    // ValidationDecision for every URS baseline it references. A product
    // that is not GxP relevant (or has no URS binding) is not checked here —
    // the URS binding check above already handles the "no baseline" case.
    if (
      this.validationDecisionResolver &&
      product &&
      ursBaselineIds.length > 0
    ) {
      for (const ursId of ursBaselineIds) {
        try {
          const approved = await this.validationDecisionResolver.hasApprovedDecision(ursId);
          if (!approved) {
            blockers.push({
              code: 'NO_APPROVED_VALIDATION_DECISION',
              message:
                `URS baseline ${ursId} has no APPROVED ValidationDecision. ` +
                'An independent expert must validate the package before it can be released.',
            });
          }
        } catch (err) {
          blockers.push({
            code: 'VALIDATION_DECISION_CHECK_FAILED',
            message: `Could not verify ValidationDecision for URS baseline ${ursId}: ${err instanceof Error ? err.message : String(err)}`,
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

    // Resolve and check the label before anything is written. Creating a
    // baseline supersedes the currently APPROVED one, so rejecting the request
    // afterwards would leave a product version with a superseded baseline and
    // no replacement.
    //
    // A baseline label is not required to look like a version — it often has
    // to match a document number in an external QMS — so it is checked for
    // presence and uniqueness rather than for a grammar. Same rule the URS
    // side reached for requirement-set baselines.
    const suppliedLabel = request.baselineVersion;
    const baselineVersion =
      suppliedLabel === undefined || suppliedLabel === null
        ? nextMajorVersionLabel(existing.map(b => b.baselineVersion))
        : String(suppliedLabel).trim();

    const labelIssues = validateBaselineLabel(baselineVersion);
    if (labelIssues.length > 0) {
      throw new InputError(labelIssues.join('; '));
    }

    // product_baselines has no unique index, so without this a duplicate was
    // simply stored. Two baselines of one ProductVersion sharing a label make
    // the candidate a ValidationContext binds to ambiguous.
    const clash = findVersionLabelClash(
      existing.map(b => b.baselineVersion),
      baselineVersion,
    );
    if (clash) {
      throw new ConflictError(
        `Baseline ${clash} already exists for product version ` +
          `${productVersionId}. Choose a different label.`,
      );
    }

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
    // Phase 5 (P5-S5): include Artifact provenance in the baseline snapshot.
    // When the version already has a commit SHA or artifact digest (from a
    // previous release candidate build), they are captured here. Pre-release
    // baselines have no digest yet — the field is absent rather than null so
    // callers can distinguish "not yet built" from "explicitly unknown".
    const dependencies = await this.repository.listProductDependencies(version.id);
    const snapshot: Record<string, unknown> = {
      version: {
        id: version.id,
        version: version.version,
        ...(version.releaseCommitSha ? { releaseCommitSha: version.releaseCommitSha } : {}),
        ...(version.artifactDigest ? { artifactDigest: version.artifactDigest } : {}),
      },
      components: components.map(c => ({
        id: c.id,
        name: c.name,
        componentType: c.componentType,
      })),
      contracts: contracts.map(c => ({
        id: c.id,
        schemaType: c.schemaType,
        version: c.version,
        ...(c.name ? { name: c.name } : {}),
      })),
      traceabilityLinks: links.map(l => ({
        id: l.id,
        sourceId: l.sourceId,
        targetType: l.targetType,
        targetId: l.targetId,
        relationshipType: l.relationshipType,
      })),
      // Declared data dependencies at baseline time (Phase 4, P4-S3).
      // Enables revalidation scope diff: what contracts does this version consume?
      dependencies: dependencies.map(d => ({
        id: d.id,
        contractId: d.contractId,
      })),
    };
    // Evidence Provenance (P-EXT-S1): attach a SHA-256 checksum of the snapshot
    // so any tampering of the baseline record is detectable. The checksum covers
    // the canonical JSON representation of the snapshot object.
    const snapshotChecksum = createHash('sha256')
      .update(JSON.stringify(snapshot))
      .digest('hex');

    const baseline: ProductBaseline = {
      id: randomUUID(),
      productVersionId,
      baselineVersion,
      status: 'DRAFT',
      snapshot: {
        ...snapshot,
        _provenance: {
          snapshotChecksum: `sha256:${snapshotChecksum}`,
          snapshotTimestamp: new Date().toISOString(),
          createdBy: actor,
        },
      },
      ursBaselineIds: request.ursBaselineIds,
      createdBy: actor,
      createdAt: new Date(),
      revision: 1,
    };
    await this.repository.createProductBaseline(baseline);
    await this.audit('PRODUCT_BASELINE', baseline.id, 'BASELINE_CREATED', actor, {
      newValue: JSON.stringify({ snapshotChecksum: `sha256:${snapshotChecksum}` }),
    });
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

    // The actor who reviewed and applied the draft becomes the product owner.
    // This satisfies the `owner-declared` platform policy obligation, so the
    // product is not blocked at the release gate for a missing owner. The actor
    // can transfer ownership afterwards; dataClassification and gxpRelevance
    // still require a deliberate manual choice before release.
    const product = await this.createProduct(
      {
        name: draft.productName,
        description: draft.description,
        productType: 'DATA_PRODUCT',
        domain: draft.domain,
        owner: actor,
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
    if (this.catalogLoader) {
      return this.catalogLoader.loadPlatformComponents();
    }
    // Graceful fallback: catalog loader not configured in this environment
    // (e.g. unit tests). Spec generation proceeds with an empty component list
    // and the LLM will suggest from whatever it already knows.
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

  /**
   * Answer a governance-bounded question about a data product.
   *
   * The caller passes the product descriptor as `productContext` — the LLM
   * sees only what the platform knows, not raw data rows. This is the
   * "governed" boundary: the AI cannot leak or fabricate production data
   * because it never receives any.
   *
   * Phase 6 (P6-S2).
   */
  async analyzeProduct(
    question: string,
    productContext: Record<string, unknown>,
    actor: string,
  ): Promise<string> {
    if (!this.llmClient) {
      throw new Error('AI product analysis is not enabled');
    }
    const trimmed = question.trim();
    if (!trimmed) {
      throw new InputError('question is required');
    }
    const answer = await this.llmClient.analyzeProduct(trimmed, productContext);
    await this.audit('AI_ANALYST', String(productContext.entityRef ?? 'unknown'), 'PRODUCT_ANALYZED', actor, {
      newValue: JSON.stringify({ question: trimmed }),
    });
    return answer;
  }

  // ── Schema Snapshots (A-2) ────────────────────────────────────────────────

  async captureSchemaSnapshot(contractId: string, actor: string): Promise<{ id: string; driftResult?: object }> {
    const contract = await this.repository.getDataContract(contractId);
    if (!contract) throw new InputError(`DataContract ${contractId} not found`);
    const schema = (contract.contractSpec ?? {}) as object;
    const id = randomUUID();
    await this.repository.createSchemaSnapshot({
      id, contractId, version: contract.version, schema,
      capturedAt: new Date().toISOString(), capturedBy: actor,
    });
    // Compare against previous snapshot if any
    const history = await this.repository.listSchemaSnapshots(contractId);
    const previous = history.find(s => s.id !== id);
    if (previous) {
      const { detectSchemaDrift } = await import('@internal/platform-common');
      const drift = detectSchemaDrift(
        { contractId, capturedAt: previous.capturedAt, schema: previous.schema as any, version: previous.version },
        schema as any,
        contract.version,
      );
      return { id, driftResult: drift };
    }
    return { id };
  }

  async listSchemaSnapshots(contractId: string) {
    return this.repository.listSchemaSnapshots(contractId);
  }

  // ── Upgrade Notifications (W2-1) ─────────────────────────────────────────

  /**
   * Dispatch upgrade notifications to all active subscribers of a contract.
   * Called when the producer releases a new version of a contract.
   * Creates one notification record per subscriber.
   */
  async dispatchUpgradeNotifications(input: {
    contractId: string;
    newVersion: string;
    summary: string;
    breaking: boolean;
    actor: string;
  }): Promise<{ dispatched: number }> {
    const contract = await this.repository.getDataContract(input.contractId);
    if (!contract) throw new InputError(`DataContract ${input.contractId} not found`);
    const subscribers = await this.repository.listSubscriptionsByContract(input.contractId);
    const active = subscribers.filter(s => s.status === 'ACTIVE');
    for (const sub of active) {
      const notif: UpgradeNotification = {
        id: randomUUID(),
        type: input.breaking ? 'BREAKING_CHANGE' : 'CONTRACT_VERSION_BUMP',
        subjectName: contract.name || contract.id,
        newVersion: input.newVersion,
        currentVersion: sub.compatibleVersions,
        summary: input.summary,
        breaking: input.breaking,
        consumerRef: sub.consumerRef,
        read: false,
        createdAt: new Date(),
      };
      await this.repository.createUpgradeNotification(notif);
    }
    await this.audit('UPGRADE_NOTIFICATION', input.contractId, 'NOTIFICATIONS_DISPATCHED', input.actor, {
      newValue: JSON.stringify({ dispatched: active.length, newVersion: input.newVersion }),
    });

    // 6-R2: Push via SSE to any consumers with an open /subscribe/notifications connection.
    const sseClients = this.sseClients;
    if (sseClients.size > 0) {
      for (const sub of active) {
        const clients = sseClients.get(sub.consumerRef);
        if (clients) {
          const payload = JSON.stringify({
            type: input.breaking ? 'BREAKING_CHANGE' : 'CONTRACT_VERSION_BUMP',
            contractId: input.contractId,
            newVersion: input.newVersion,
            summary: input.summary,
          });
          for (const client of clients) {
            try { client.write(`data: ${payload}\n\n`); } catch { /* client disconnected */ }
          }
        }
      }
    }

    return { dispatched: active.length };
  }

  async listMyUpgradeNotifications(consumerRef: string, unreadOnly: boolean): Promise<UpgradeNotification[]> {
    return this.repository.listUpgradeNotifications(consumerRef, unreadOnly);
  }

  async markUpgradeNotificationRead(id: string): Promise<void> {
    return this.repository.markNotificationRead(id);
  }

  // ── Contract Subscriptions (P-EXT-S4) ────────────────────────────────────

  async subscribeToContract(
    request: CreateSubscriptionRequest,
    actor: string,
  ): Promise<ContractSubscription> {
    const contract = await this.repository.getDataContract(request.contractId);
    if (!contract) throw new InputError(`DataContract ${request.contractId} not found`);
    const consumerRef = String(request.consumerRef ?? '').trim();
    if (!consumerRef) throw new InputError('consumerRef is required');
    const label = String(request.consumerLabel ?? '').trim();
    if (!label) throw new InputError('consumerLabel is required');
    const existing = await this.repository.findSubscription(request.contractId, consumerRef);
    if (existing) {
      throw new ConflictError(
        `${consumerRef} is already subscribed to contract ${request.contractId} (status: ${existing.status})`,
      );
    }
    const sub: ContractSubscription = {
      id: randomUUID(),
      contractId: request.contractId,
      consumerRef,
      consumerLabel: label,
      compatibleVersions: request.compatibleVersions ?? '*',
      status: 'ACTIVE',
      purpose: request.purpose,
      createdBy: actor,
      createdAt: new Date(),
      revision: 1,
    };
    await this.repository.createSubscription(sub);
    await this.audit('CONTRACT_SUBSCRIPTION', sub.id, 'SUBSCRIPTION_CREATED', actor, {
      newValue: JSON.stringify({ contractId: request.contractId, consumerRef }),
    });
    return sub;
  }

  async listContractSubscribers(contractId: string): Promise<ContractSubscription[]> {
    return this.repository.listSubscriptionsByContract(contractId);
  }

  async listMySubscriptions(consumerRef: string): Promise<ContractSubscription[]> {
    return this.repository.listSubscriptionsByConsumer(consumerRef);
  }

  async updateSubscriptionStatus(
    id: string,
    status: string,
    actor: string,
  ): Promise<void> {
    if (!(SUBSCRIPTION_STATUSES as readonly string[]).includes(status)) {
      throw new InputError(`Invalid status "${status}". Expected: ${SUBSCRIPTION_STATUSES.join(', ')}`);
    }
    const existing = await this.repository.getSubscription(id);
    if (!existing) throw new InputError(`Subscription ${id} not found`);
    await this.repository.updateSubscriptionStatus(id, status as ContractSubscription['status']);
    await this.audit('CONTRACT_SUBSCRIPTION', id, 'SUBSCRIPTION_STATUS_CHANGED', actor, {
      oldValue: existing.status, newValue: status,
    });
  }

  // ── Multi-hop Lineage DAG (W3-1) ─────────────────────────────────────────

  /**
   * Compute the full multi-hop data lineage graph for a product version.
   *
   * Unlike `getDataLineage` (one-hop), this method traverses the entire
   * dependency graph up to `maxDepth` hops upstream and downstream. The
   * result is a DAG (nodes + edges) that can be rendered as a visual diagram.
   *
   * Upstream: version → depends on → contract → produced by → version → ...
   * Downstream: version → produces → contract → consumed by → version → ...
   *
   * Cycles are detected and cut to prevent infinite loops. The algorithm is
   * breadth-first to keep memory bounded.
   */
  async getFullLineageDAG(
    versionId: string,
    maxDepth = 5,
  ): Promise<{
    nodes: Array<{ id: string; type: 'version' | 'contract'; label: string; productName?: string }>;
    edges: Array<{ from: string; to: string; relation: 'produces' | 'consumes' }>;
    rootVersionId: string;
    depth: number;
  }> {
    const nodes = new Map<string, { id: string; type: 'version' | 'contract'; label: string; productName?: string }>();
    const edges: Array<{ from: string; to: string; relation: 'produces' | 'consumes' }> = [];
    const visited = new Set<string>();

    // BFS queue: [versionId, currentDepth, direction]
    const queue: Array<[string, number, 'up' | 'down' | 'both']> = [[versionId, 0, 'both']];
    visited.add(versionId);

    // Register root node
    const rootVersion = await this.repository.getProductVersion(versionId);
    const rootProduct = rootVersion ? await this.repository.getProduct(rootVersion.productId) : null;
    nodes.set(versionId, {
      id: versionId,
      type: 'version',
      label: `${rootProduct?.name ?? 'Unknown'} v${rootVersion?.version ?? '?'}`,
      productName: rootProduct?.name,
    });

    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      const [currentVersionId, depth] = item;
      if (depth >= maxDepth) continue;

      // ── Upstream (what this version consumes) ────────────────────────────
      const deps = await this.repository.listProductDependencies(currentVersionId);
      for (const dep of deps) {
        const contract = await this.repository.getDataContract(dep.contractId);
        if (!contract) continue;
        const contractNodeId = `contract:${contract.id}`;
        if (!nodes.has(contractNodeId)) {
          nodes.set(contractNodeId, { id: contractNodeId, type: 'contract', label: contract.name || contract.id });
        }
        edges.push({ from: currentVersionId, to: contractNodeId, relation: 'consumes' });

        // Trace the contract back to its producer
        const producerComponent = await this.repository.getProductComponent(contract.productComponentId);
        if (!producerComponent) continue;
        const producerVersionId = producerComponent.productVersionId;
        if (!nodes.has(producerVersionId)) {
          const pv = await this.repository.getProductVersion(producerVersionId);
          const pp = pv ? await this.repository.getProduct(pv.productId) : null;
          nodes.set(producerVersionId, {
            id: producerVersionId, type: 'version',
            label: `${pp?.name ?? 'Unknown'} v${pv?.version ?? '?'}`,
            productName: pp?.name,
          });
          edges.push({ from: producerVersionId, to: contractNodeId, relation: 'produces' });
          if (!visited.has(producerVersionId)) {
            visited.add(producerVersionId);
            queue.push([producerVersionId, depth + 1, 'up']);
          }
        }
      }

      // ── Downstream (who consumes this version's contracts) ───────────────
      const components = await this.repository.listProductComponents(currentVersionId);
      for (const comp of components) {
        const contracts = await this.repository.listDataContracts(comp.id);
        for (const contract of contracts) {
          const contractNodeId = `contract:${contract.id}`;
          if (!nodes.has(contractNodeId)) {
            nodes.set(contractNodeId, { id: contractNodeId, type: 'contract', label: contract.name || contract.id });
            edges.push({ from: currentVersionId, to: contractNodeId, relation: 'produces' });
          }
          const consumers = await this.repository.listDependenciesByContractId(contract.id);
          for (const consumer of consumers) {
            if (consumer.productVersionId === currentVersionId) continue;
            const cv = await this.repository.getProductVersion(consumer.productVersionId);
            const cp = cv ? await this.repository.getProduct(cv.productId) : null;
            const consumerVersionId = consumer.productVersionId;
            if (!nodes.has(consumerVersionId)) {
              nodes.set(consumerVersionId, {
                id: consumerVersionId, type: 'version',
                label: `${cp?.name ?? 'Unknown'} v${cv?.version ?? '?'}`,
                productName: cp?.name,
              });
            }
            edges.push({ from: consumerVersionId, to: contractNodeId, relation: 'consumes' });
            if (!visited.has(consumerVersionId)) {
              visited.add(consumerVersionId);
              queue.push([consumerVersionId, depth + 1, 'down']);
            }
          }
        }
      }
    }

    return {
      nodes: [...nodes.values()],
      edges,
      rootVersionId: versionId,
      depth: maxDepth,
    };
  }

  // ── Revalidation Scope (W2-3) ────────────────────────────────────────────

  /**
   * What needs to be re-tested after a product baseline changes?
   *
   * Compares the current (latest) approved baseline with the previous one
   * and returns the delta: added/removed components and contracts. Validators
   * use this to scope IQ/OQ/UAT without full re-testing.
   *
   * Returns `null` when fewer than two approved baselines exist — there is
   * nothing to diff.
   */
  async getRevalidationScope(productVersionId: string): Promise<{
    productVersionId: string;
    currentBaselineId: string;
    previousBaselineId: string | null;
    addedComponents: string[];
    removedComponents: string[];
    addedContracts: string[];
    removedContracts: string[];
    hasChanges: boolean;
    recommendation: string;
  } | null> {
    const baselines = await this.repository.listProductBaselines(productVersionId);
    const approved = baselines.filter(b => b.status === 'APPROVED')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (approved.length === 0) return null;

    const current = approved[0];
    const previous = approved[1] ?? null;

    const currentSnap = (current.snapshot ?? {}) as Record<string, unknown>;
    const previousSnap = previous ? ((previous.snapshot ?? {}) as Record<string, unknown>) : null;

    const currentComponents = ((currentSnap.components ?? []) as Array<{ name: string }>).map(c => c.name);
    const previousComponents = previousSnap
      ? ((previousSnap.components ?? []) as Array<{ name: string }>).map(c => c.name)
      : [];
    const currentContracts = ((currentSnap.contracts ?? []) as Array<{ id: string }>).map(c => c.id);
    const previousContracts = previousSnap
      ? ((previousSnap.contracts ?? []) as Array<{ id: string }>).map(c => c.id)
      : [];

    const addedComponents = currentComponents.filter(c => !previousComponents.includes(c));
    const removedComponents = previousComponents.filter(c => !currentComponents.includes(c));
    const addedContracts = currentContracts.filter(c => !previousContracts.includes(c));
    const removedContracts = previousContracts.filter(c => !currentContracts.includes(c));
    const hasChanges = addedComponents.length > 0 || removedComponents.length > 0 ||
      addedContracts.length > 0 || removedContracts.length > 0;

    let recommendation: string;
    if (hasChanges) {
      const changed =
        [...addedComponents, ...removedComponents].join(', ') || 'none';
      recommendation = `Full IQ and targeted OQ/UAT for changed components: ${changed}.`;
    } else if (previous) {
      recommendation =
        'No structural changes since last baseline. Regression test only.';
    } else {
      recommendation = 'First approved baseline — full IQ/OQ/UAT required.';
    }

    return {
      productVersionId,
      currentBaselineId: current.id,
      previousBaselineId: previous?.id ?? null,
      addedComponents,
      removedComponents,
      addedContracts,
      removedContracts,
      hasChanges,
      recommendation,
    };
  }

  // ── Change Impact Analysis (P-EXT-S3) ────────────────────────────────────

  /**
   * Which product versions depend — directly or via a contract — on a given
   * DataContract ID?
   *
   * Used by the release gate and UI to answer: "If I update this contract,
   * who is affected?" Returns a flat list of impacted version IDs and their
   * products so the caller can decide whether to block the change, notify
   * consumers, or trigger revalidation.
   *
   * This is a one-hop analysis (direct ProductDependency links). Multi-hop
   * traversal (A depends on B which depends on C) is Phase 6 follow-up.
   */
  async getContractChangeImpact(contractId: string): Promise<{
    contractId: string;
    directConsumers: Array<{
      dependencyId: string;
      productVersionId: string;
      productVersionVersion: string;
      productId: string;
      productName: string;
    }>;
    totalAffected: number;
  }> {
    const deps = await this.repository.listDependenciesByContractId(contractId);
    const consumers = [];
    for (const dep of deps) {
      const version = await this.repository.getProductVersion(dep.productVersionId);
      if (!version) continue;
      const product = await this.repository.getProduct(version.productId);
      if (!product) continue;
      consumers.push({
        dependencyId: dep.id,
        productVersionId: version.id,
        productVersionVersion: version.version,
        productId: product.id,
        productName: product.name,
      });
    }
    return { contractId, directConsumers: consumers, totalAffected: consumers.length };
  }

  /**
   * Which product versions are affected by a change to a specific Artifact
   * version (identified by namespace/name@version)?
   *
   * Finds all ProductDependencies whose `contractId` points to a contract
   * produced by a component of a product that uses this Artifact. This is
   * the "upstream impact" view: changing the Artifact might change the contract,
   * which breaks consumers.
   */
  async getArtifactChangeImpact(artifactName: string): Promise<{
    artifactName: string;
    affectedContracts: string[];
    affectedVersions: Array<{ productVersionId: string; productName: string }>;
    totalAffected: number;
  }> {
    // Find all products whose name matches the artifact (heuristic for now).
    // listProducts is paginated; impact analysis has to see every product, so
    // this asks for a page large enough to be the whole table in practice.
    const { items: products } = await this.repository.listProducts(
      ARTIFACT_IMPACT_SCAN_LIMIT,
      0,
    );
    const matched = products.filter(p =>
      p.name.toLowerCase().includes(artifactName.toLowerCase()),
    );
    const affectedContracts = new Set<string>();
    const affectedVersions: Array<{ productVersionId: string; productName: string }> = [];

    for (const product of matched) {
      const versions = await this.repository.listProductVersions(product.id);
      for (const version of versions) {
        const components = await this.repository.listProductComponents(version.id);
        for (const comp of components) {
          const contracts = await this.repository.listDataContracts(comp.id);
          for (const contract of contracts) {
            affectedContracts.add(contract.id);
            const impact = await this.getContractChangeImpact(contract.id);
            for (const consumer of impact.directConsumers) {
              affectedVersions.push({
                productVersionId: consumer.productVersionId,
                productName: consumer.productName,
              });
            }
          }
        }
      }
    }

    const unique = [...new Map(affectedVersions.map(v => [v.productVersionId, v])).values()];
    return {
      artifactName,
      affectedContracts: [...affectedContracts],
      affectedVersions: unique,
      totalAffected: unique.length,
    };
  }
}
