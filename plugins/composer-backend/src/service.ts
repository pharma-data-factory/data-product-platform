/**
 * Product Composer service layer.
 *
 * Owns Product/Version/Component/Contract CRUD plus traceability links.
 * Writes an append-only audit event for each mutation (ALCOA-aligned).
 */

import { LoggerService } from '@backstage/backend-plugin-api';
import {
  ConflictError,
  InputError,
  NotAllowedError,
  NotFoundError,
  NotImplementedError,
  ServiceUnavailableError,
} from '@backstage/errors';
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
  ProductRequirement,
  ProductRequirementCoverage,
  ProductRequirementCoverageRow,
  FunctionalSpecification,
  FunctionalSpecificationTraceRow,
  ProductVersion,
  QualityRule,
  ReleaseProvenance,
  SUBSCRIPTION_STATUSES,
  SnapshotItemChange,
  TraceabilityLink,
  contractRef,
  validateContractExchange,
  validateReleaseProvenance,
  isSameProvenance,
  findVersionLabelClash,
  parseContractRef,
  isQualityRuleType,
  nextMajorVersionLabel,
  isDataContractSchemaType,
  validateBaselineLabel,
  validateDataContractSchemaType,
  validateProduct,
  validateProductGovernance,
  validateCatalogEntityRef,
  validateProductRequirement,
  validateNameSegment,
  validateVersionLabel,
  validateTraceabilityLink,
  validateTestExecution,
  latestExecutionPerCase,
  evaluateContractCompatibility,
  type ContractCompatReport,
  type ContractExchange,
  type JsonSchemaLike,
} from '@internal/platform-common';
import { IComposerRepository, ComposerAuditEvent } from './repository-interface';
import type { CiEvidenceClient } from './ci-evidence-client';
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
  AuditContext,
  TestExecution,
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
/**
 * What the Validation Expert knows about one URS baseline, per requirement.
 *
 * Slice 1b. The Validation Context already computes this — it is keyed to a
 * URS baseline and carries stable logical requirement ids, the same key
 * `ProductRequirement.requirementRef` holds. What was missing is anyone asking
 * for it from the product side.
 */
export interface ValidationCoverageSummary {
  contextId: string;
  /** True only when the context carries an APPROVED ValidationDecision. */
  decisionApproved: boolean;
  /** Keyed by stable requirement id (`URS-OEE-014`), not version UUID. */
  byRequirement: Map<
    string,
    { testIds: string[]; runIds: string[]; findingIds: string[] }
  >;
}

export interface ValidationDecisionResolver {
  /**
   * Returns true when the ValidationContext for `baselineId` has an APPROVED
   * ValidationDecision. Returns false when no context or no decision exists,
   * or when the decision status is CONDITIONAL or REJECTED.
   */
  hasApprovedDecision(baselineId: string, productVersionId?: string): Promise<boolean>;
  /**
   * NXD-119. `APPROVED_GMP` when the decision carries the validation expert's
   * and QA's approval, `APPROVED` when it was approved under the
   * one-signature rule, `NONE` otherwise. Optional so existing resolver
   * doubles keep compiling; the gate falls back to `hasApprovedDecision`.
   */
  getDecisionApproval?(
    baselineId: string,
    /** NXD-127: the decision is per product version. */
    productVersionId?: string,
  ): Promise<'APPROVED_GMP' | 'APPROVED' | 'NONE'>;
  /**
   * Per-requirement validation coverage for a URS baseline, or `undefined`
   * when no context could be resolved.
   *
   * `undefined` is load-bearing: "no validation context exists" and "the
   * validation-expert is unreachable" must not render as "nothing is
   * validated", which is a statement about the product rather than about the
   * lookup. Optional so existing resolver doubles in tests keep compiling.
   */
  getValidationCoverage?(
    baselineId: string,
    productVersionId?: string,
  ): Promise<ValidationCoverageSummary | undefined>;
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
 * Everything the platform can attest about one product version, assembled.
 *
 * Every field below was already readable — through some fifteen separate
 * endpoints. Nothing composed them, so demonstrating that a product had been
 * governed meant a human making fifteen calls and stapling the answers
 * together, which is exactly the task an inspector asks for and exactly the
 * one the platform made hardest.
 *
 * Read-only and derived. It writes nothing, stores nothing, and holds no
 * opinion the underlying records do not already hold — re-running it after a
 * change yields the new answer rather than a stale snapshot. A frozen,
 * signed export is a different artifact and would need its own content hash;
 * this is the aggregation that has to exist first.
 *
 * Modelled on `buildOverview` in `validation-expert-backend`, including the
 * part that matters most: `limits`. A package that does not say what it fails
 * to prove invites the reader to assume it proves everything.
 */
export interface ProductEvidencePackage {
  generatedAt: Date;
  product: Product;
  version: ProductVersion;
  /** The URS baseline this version implements, if one is bound. */
  ursBaselineId?: string;
  requirements: ProductRequirement[];
  coverage: ProductRequirementCoverage;
  functionalSpecifications: FunctionalSpecification[];
  functionalSpecTrace: FunctionalSpecificationTraceRow[];
  components: ProductComponent[];
  contracts: DataContract[];
  traceabilityLinks: TraceabilityLink[];
  baselines: ProductBaseline[];
  releaseGate: { passed: boolean; blockers: ReleaseGateBlocker[] };
  /** Append-only trail for the version and for the product that owns it. */
  auditTrail: ComposerAuditEvent[];
  /**
   * What this package does not establish. Written into the document rather
   * than into documentation, because the reader of an evidence package is
   * rarely the reader of a repository.
   */
  limits: readonly string[];
}

/**
 * What an evidence package does not establish.
 *
 * Carried in the document rather than left to documentation. The reader of an
 * evidence package is rarely the reader of this repository, and a package that
 * states no limits invites the reader to assume there are none — which is the
 * failure mode a regulated record is least able to afford.
 *
 * Each line is a position the platform holds and can defend, not a gap it is
 * embarrassed by. They are recorded in `NXD-077`.
 */
const EVIDENCE_PACKAGE_LIMITS: readonly string[] = [
  // NXD-074 asked whether the product side needs electronic signatures and
  // answered no: traceability-and-gmp.md scopes them to the URS side, its gap
  // list does not name product approvals, and "nobody approves their own work"
  // already holds through permission plus segregation of duties. But the
  // asymmetry becomes visible exactly here, printed beside a URS baseline that
  // *is* signed — so it is stated rather than left for a reader to notice.
  'Product-side approvals are authorised and attributed, not electronically ' +
    'signed. A URS baseline carries a 21 CFR Part 11 signature bound to a ' +
    'content hash; a product baseline approval carries the actor, the ' +
    'timestamp and a segregation-of-duties refusal if the approver authored ' +
    'it. The two are not equivalent and this package does not present them as ' +
    'equivalent.',
  'Deployment is not recorded. Nexora governs and attests; the microservice ' +
    'itself is deployed by GitHub. A released version here means the release ' +
    'gate passed, not that anything is running.',
  'Events are correlated within this plugin, not across plugins. Acts on the ' +
    'URS side and acts on the product side cannot yet be joined into one ' +
    'operation — see NXD-066.',
  'This is a derived reading, not a frozen export. It reflects the records as ' +
    'they stand when it is generated, and carries no content hash of its own.',
];

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
  /** NXD-123. Test evidence from a product repository's CI. */
  ciEvidenceClient?: CiEvidenceClient;
  /**
   * Shared SSE client registry. Injected by the router so upgrade notifications
   * can push events to connected consumers without any property bag tricks.
   */
  sseClients?: Map<string, Set<{ write(s: string): void }>>;
}

/**
 * A value for a varchar(255) column, kept unique: longer values are cut and
 * given a hash of the whole, so two long test ids never collapse into one.
 */
function fitColumn(value: string, max = 255): string {
  if (value.length <= max) {
    return value;
  }
  const hash = createHash('sha256').update(value).digest('hex').slice(0, 12);
  return `${value.slice(0, max - 13)}#${hash}`;
}

export class ComposerService {
  private readonly logger: LoggerService;
  private readonly repository: IComposerRepository;
  private readonly ursBaselineResolver?: UrsBaselineResolver;
  private readonly llmClient?: ComposerLLMClient;
  private readonly catalogLoader?: CatalogComponentLoader;
  private readonly validationDecisionResolver?: ValidationDecisionResolver;
  private readonly policyResolverClient?: PolicyResolverClient;
  private readonly ciEvidenceClient?: CiEvidenceClient;
  readonly sseClients: Map<string, Set<{ write(s: string): void }>>;

  constructor(options: ComposerServiceOptions) {
    this.logger = options.logger;
    this.repository = options.repository;
    this.ursBaselineResolver = options.ursBaselineResolver;
    this.llmClient = options.llmClient;
    this.catalogLoader = options.catalogLoader;
    this.validationDecisionResolver = options.validationDecisionResolver;
    this.policyResolverClient = options.policyResolverClient;
    this.ciEvidenceClient = options.ciEvidenceClient;
    this.sseClients = options.sseClients ?? new Map();
  }

  async createProduct(
    request: CreateProductRequest,
    actor: string,
    inheritedAudit?: AuditContext,
  ): Promise<Product> {
    const audit = this.beginAudit(actor, inheritedAudit);
    const issues = [
      ...validateProduct(request),
      ...this.identityIssues(request),
    ];
    if (issues.length > 0) {
      throw new InputError(issues.join('; '));
    }
    await this.assertCatalogEntityUnclaimed(request.catalogEntityRef);
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
      repositoryUrl: request.repositoryUrl,
      catalogEntityRef: request.catalogEntityRef,
      createdBy: actor,
      createdAt: new Date(),
      revision: 1,
    };
    await this.repository.createProduct(product);
    await this.audit(audit, 'PRODUCT', product.id, 'PRODUCT_CREATED');
    return product;
  }

  /**
   * Why the identity fields on a write are unusable, or `[]` if they are fine.
   *
   * Shape only. Whether the entity exists is the Catalog's business and whether
   * it is already claimed is the next check's; this one answers the question a
   * caller can fix without looking anything up.
   */
  private identityIssues(request: Partial<CreateProductRequest>): string[] {
    const issues: string[] = [];
    if (request.catalogEntityRef !== undefined) {
      issues.push(...validateCatalogEntityRef(request.catalogEntityRef));
    }
    if (request.repositoryUrl !== undefined) {
      const url = request.repositoryUrl.trim();
      // A repository URL is displayed as a link and handed to a developer to
      // clone. Anything that is not http(s) is either a mistake or a way to put
      // a `javascript:` target in front of a user.
      if (!/^https?:\/\/\S+$/.test(url)) {
        issues.push(
          `repositoryUrl "${request.repositoryUrl}" must be an http(s) URL`,
        );
      }
    }
    return issues;
  }

  /**
   * Refuses a Catalog entity that another product already claims.
   *
   * The database enforces this too, and that is the authority — this check
   * exists to answer with the id of the product that holds it, because the
   * caller is usually a scaffolder task whose next move depends on knowing
   * which one. A race still ends at the unique index, which is the point of
   * having it (NXD-009).
   */
  private async assertCatalogEntityUnclaimed(
    entityRef: string | undefined,
    exceptProductId?: string,
  ): Promise<void> {
    if (!entityRef) {
      return;
    }
    const existing = await this.repository.getProductByCatalogEntityRef(
      entityRef,
    );
    if (existing && existing.id !== exceptProductId) {
      throw new ConflictError(
        `Catalog entity ${entityRef} is already claimed by product ` +
          `${existing.name} (${existing.id})`,
      );
    }
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

  /**
   * The products whose versions are bound to a URS baseline, with their GxP
   * relevance, and who created those versions (NXD-119).
   *
   * The Validation Expert decides from this which signatures a decision on the
   * baseline needs (validation expert and QA when any is GMP-relevant), and
   * keeps a version's creator from signing the validation of it.
   */
  async getUrsBaselineGmpClassification(ursBaselineId: string): Promise<{
    ursBaselineId: string;
    products: Array<{ id: string; name: string; gxpRelevance?: string }>;
    versionCreators: string[];
    /** NXD-124: the versions bound, so a review can name the one it checks. */
    versions: Array<{
      id: string;
      productId: string;
      productName: string;
      version: string;
      status: string;
      createdBy: string;
    }>;
  }> {
    const versions =
      await this.repository.listProductVersionsForUrsBaseline(ursBaselineId);
    const products = [];
    for (const productId of new Set(versions.map(v => v.productId))) {
      const product = await this.repository.getProduct(productId);
      if (product) {
        products.push({
          id: product.id,
          name: product.name,
          gxpRelevance: product.gxpRelevance,
        });
      }
    }
    const nameOf = new Map(products.map(p => [p.id, p.name]));
    return {
      ursBaselineId,
      products,
      versionCreators: [
        ...new Set(versions.map(v => v.createdBy).filter(Boolean)),
      ],
      versions: versions.map(v => ({
        id: v.id,
        productId: v.productId,
        productName: nameOf.get(v.productId) ?? v.productId,
        version: v.version,
        status: v.status,
        createdBy: v.createdBy,
      })),
    };
  }

  /**
   * The test evidence recorded for a version, per bound requirement: the
   * newest execution of each test case (NXD-124). The Validation Expert's
   * product evidence review reads this; it is what "verified" means here.
   */
  async getVersionTestEvidence(productVersionId: string): Promise<{
    productVersionId: string;
    productName: string;
    version: string;
    ursBaselineId?: string;
    requirements: Array<{
      requirementRef: string;
      executions: Array<{
        testSuite: string;
        testCase: string;
        status: string;
        executedAt: string;
        executionArtifactUrl?: string;
      }>;
    }>;
  }> {
    const version = await this.repository.getProductVersion(productVersionId);
    if (!version) {
      throw new NotFoundError(`Product version ${productVersionId} not found`);
    }
    const product = await this.repository.getProduct(version.productId);
    const requirements = await this.repository.listProductRequirements(productVersionId);
    const executions = await this.repository.listTestExecutions(
      requirements.map(r => r.ursRequirementVersionId),
    );
    return {
      productVersionId,
      productName: product?.name ?? version.productId,
      version: version.version,
      ursBaselineId: version.ursBaselineId,
      requirements: requirements.map(r => ({
        requirementRef: r.requirementRef,
        executions: latestExecutionPerCase(
          executions.filter(e => e.requirementVersionId === r.ursRequirementVersionId),
        ).map(e => ({
          testSuite: e.testSuite,
          testCase: e.testCase,
          status: e.status,
          executedAt: new Date(e.executedAt).toISOString(),
          executionArtifactUrl: e.executionArtifactUrl,
        })),
      })),
    };
  }

  /** The product that claims a Catalog entity, or null. Step 2. */
  async getProductByCatalogEntityRef(
    entityRef: string,
  ): Promise<Product | null> {
    const issues = validateCatalogEntityRef(entityRef);
    if (issues.length > 0) {
      throw new InputError(issues.join('; '));
    }
    return this.repository.getProductByCatalogEntityRef(entityRef);
  }

  async updateProduct(
    id: string,
    request: Partial<CreateProductRequest>,
    actor: string,
  ): Promise<Product> {
    const audit = this.beginAudit(actor);
    const existing = await this.repository.getProduct(id);
    if (!existing) {
      throw new NotFoundError(`Product ${id} not found`);
    }
    // `createProduct` validated and this did not, so every vocabulary field on
    // the product could be set to anything at all through the edit path even
    // once the create path refused it. Governance only — a partial update is
    // not required to restate name and productType.
    //
    // InputError, not Error: `respondError` maps a plain Error to
    // `500 {"error":"Internal server error"}`, so the live refusal read as a
    // server fault and the caller never saw which value was rejected. Found by
    // driving the API on 2026-09-25, one day after this check was written.
    const issues = [
      ...validateProductGovernance(request),
      ...this.identityIssues(request),
    ];
    if (issues.length > 0) {
      throw new InputError(issues.join('; '));
    }
    await this.assertCatalogEntityUnclaimed(request.catalogEntityRef, id);
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
      // The same omission `createProduct` carried for `declaredPolicies`:
      // requested, stored, and never mapped, so the field could not be written
      // through this method at all. `data-classification-declared` is one of
      // the three platform-policy obligations every product must meet, which
      // made it unclearable — the release gate asked for something the write
      // path could not record.
      dataClassification:
        (request.dataClassification as Product['dataClassification']) ??
        existing.dataClassification,
      lifecycle:
        (request.lifecycle as Product['lifecycle']) ?? existing.lifecycle,
      declaredPolicies: request.declaredPolicies ?? existing.declaredPolicies,
      // Step 2's identity. Settable here as well as at creation, because the
      // action writes the row after the repository and the entity exist, and a
      // product created by one of the other three paths may be joined to a
      // repository later. `??`, so an update that mentions neither leaves both.
      repositoryUrl: request.repositoryUrl ?? existing.repositoryUrl,
      catalogEntityRef: request.catalogEntityRef ?? existing.catalogEntityRef,
      updatedBy: actor,
      updatedAt: new Date(),
      revision: existing.revision + 1,
    };
    await this.repository.updateProduct(updated);
    await this.audit(audit, 'PRODUCT', id, 'PRODUCT_UPDATED');
    return updated;
  }

  async createProductVersion(
    productId: string,
    request: CreateProductVersionRequest,
    actor: string,
    inheritedAudit?: AuditContext,
  ): Promise<ProductVersion> {
    const audit = this.beginAudit(actor, inheritedAudit);
    const product = await this.repository.getProduct(productId);
    if (!product) {
      throw new NotFoundError(`Product ${productId} not found`);
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
    await this.audit(audit, 'PRODUCT_VERSION', version.id, 'PRODUCT_VERSION_CREATED');
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
    inheritedAudit?: AuditContext,
  ): Promise<ProductComponent> {
    const audit = this.beginAudit(actor, inheritedAudit);
    await this.requireDraftVersion(
      versionId,
      'A component can only be added while the version is DRAFT — the ' +
        'architecture of a version is part of what was approved.',
    );
    if (!request.name?.trim()) {
      throw new InputError('Component name is required');
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
    await this.audit(audit, 'PRODUCT_COMPONENT', component.id, 'PRODUCT_COMPONENT_CREATED');
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
    const audit = this.beginAudit(actor);
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

    // The component, and through it the version, is resolved before anything
    // is written. This method used to load neither — `data_contracts` has a
    // foreign key to `product_components`, so an unknown component id was
    // refused by the database rather than by the service, and the driver error
    // reached the caller as 500 "Internal server error". SQLite does not
    // enforce foreign keys unless `PRAGMA foreign_keys=ON`, which nothing here
    // sets, so the tests wrote the row and only PostgreSQL ever complained.
    // NXD-072.
    const component = await this.repository.getProductComponent(componentId);
    if (!component) {
      throw new NotFoundError(
        `Product component ${componentId} not found. A DataContract is ` +
          'published by a component, so there is nothing for it to belong to.',
      );
    }
    await this.requireDraftVersion(
      component.productVersionId,
      'A data contract can only be added while the version is DRAFT — what a ' +
        'version publishes is part of what was approved.',
    );

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
    await this.audit(audit, 'DATA_CONTRACT', contract.id, 'DATA_CONTRACT_CREATED');
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
    const audit = this.beginAudit(actor);
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
    // The other end was never checked at all. `product_version_dependencies`
    // has a foreign key to `product_versions`, so on PostgreSQL an unknown
    // version id came back as 500 rather than 404 — see the note in
    // `addDataContract`. NXD-072.
    await this.requireDraftVersion(
      versionId,
      'A dependency can only be declared while the version is DRAFT — what a ' +
        'version consumes is part of what was approved.',
    );
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
    await this.audit(audit, 'PRODUCT_DEPENDENCY', dep.id, 'PRODUCT_DEPENDENCY_ADDED', {
      newValue: JSON.stringify({ versionId, contractId }),
    });
    return dep;
  }

  async listProductDependencies(versionId: string): Promise<ProductDependency[]> {
    return this.repository.listProductDependencies(versionId);
  }

  async removeProductDependency(id: string, actor: string): Promise<void> {
    const audit = this.beginAudit(actor);
    const dep = await this.repository.getProductDependency(id);
    if (!dep) {
      // Was an InputError, so a dependency that is not there answered 400.
      // Asking for something absent is a 404; the caller sent nothing wrong.
      throw new NotFoundError(`ProductDependency ${id} not found`);
    }
    await this.requireDraftVersion(
      dep.productVersionId,
      'A dependency can only be removed while the version is DRAFT — what a ' +
        'version consumes is part of what was approved.',
    );
    await this.repository.deleteProductDependency(id);
    await this.audit(audit, 'PRODUCT_DEPENDENCY', id, 'PRODUCT_DEPENDENCY_REMOVED');
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

  /**
   * Bind a Product Version to an approved URS baseline and snapshot its
   * requirements.
   *
   * This is the joint the whole left-to-right journey turns on. Before it, the
   * only record that a product implements anything was a nullable JSON column
   * on an optional child object, written by one code path; requirement text
   * was fetched once to build an LLM prompt and thrown away.
   *
   * Three refusals, each deliberate:
   *
   *  - **not DRAFT** — the requirements a version implements are part of what
   *    was approved. Adding them after approval would change the scope of an
   *    approved record without re-approval.
   *  - **already bound** — rebinding is change control, not editing. The
   *    supersede path (a new version bound to the new baseline) keeps both the
   *    old and the new relationship on the record; overwriting keeps neither.
   *  - **not fully resolvable** — enforced by the resolver. A snapshot missing
   *    requirements nobody knows are missing is the failure this whole slice
   *    exists to prevent.
   */
  async bindUrsBaseline(
    productVersionId: string,
    ursBaselineId: string,
    actor: string,
    inheritedAudit?: AuditContext,
  ): Promise<{ version: ProductVersion; requirements: ProductRequirement[] }> {
    const audit = this.beginAudit(actor, inheritedAudit);
    const trimmed = String(ursBaselineId ?? '').trim();
    if (!trimmed) {
      throw new InputError('ursBaselineId is required');
    }

    const version = await this.requireDraftVersion(
      productVersionId,
      `A URS baseline can only be bound while the version is DRAFT — the ` +
        `requirements a version implements are part of what was approved.`,
    );
    if (version.ursBaselineId) {
      throw new ConflictError(
        `Product version ${version.version} is already bound to URS baseline ` +
          `${version.ursBaselineId}. Binding a different baseline is a change ` +
          `to what the product implements: create a new product version for ` +
          `it, so both relationships stay on the record.`,
      );
    }

    if (!this.ursBaselineResolver) {
      throw new ConflictError(
        'No URS baseline resolver is configured, so the baseline cannot be ' +
          'verified as approved. Refusing to record an unverified binding.',
      );
    }

    // Throws unless the baseline is APPROVED and every pinned requirement
    // version resolved. Both checks live in the resolver.
    const context = await this.ursBaselineResolver.resolveBaselineContext(trimmed);

    const now = new Date();
    const requirements: ProductRequirement[] = [];
    const issues: string[] = [];
    context.requirements.forEach((summary, index) => {
      const candidate = {
        id: randomUUID(),
        productVersionId,
        ursBaselineId: context.baselineId,
        ursRequirementVersionId: summary.id,
        requirementRef: summary.requirementRef ?? '',
        title: summary.title,
        statement: summary.statement,
        category: summary.category,
        priority: summary.priority,
        gxpRelevance: summary.gxpRelevance,
        versionLabel: summary.versionLabel,
        contentHash: summary.contentHash,
        origin: 'PRODUCT' as const,
        position: index,
        createdBy: actor,
        createdAt: now,
      };
      const rowIssues = validateProductRequirement(candidate);
      if (rowIssues.length > 0) {
        issues.push(`  ${summary.id}: ${rowIssues.join('; ')}`);
        return;
      }
      requirements.push(candidate);
    });

    // Report every bad row at once. Binding is a single deliberate act; making
    // someone discover the second malformed requirement only after fixing the
    // first turns one conversation with the URS owner into several.
    if (issues.length > 0) {
      throw new InputError(
        `URS baseline ${trimmed} cannot be bound: ${issues.length} of ` +
          `${context.requirements.length} requirements are unusable.\n` +
          `${issues.join('\n')}\n` +
          `A requirement with no stable id cannot be mapped to a component ` +
          `or a test, so storing it would create coverage that can never be ` +
          `satisfied.`,
      );
    }

    await this.repository.bindUrsBaseline(
      productVersionId,
      context.baselineId,
      requirements,
    );

    await this.audit(audit, 'PRODUCT_VERSION', productVersionId, 'URS_BASELINE_BOUND',
      {
        newValue: JSON.stringify({
          ursBaselineId: context.baselineId,
          baselineVersion: context.baselineVersion,
          requirementCount: requirements.length,
        }),
      },
    );

    return {
      version: { ...version, ursBaselineId: context.baselineId },
      requirements,
    };
  }

  async listProductRequirements(
    productVersionId: string,
  ): Promise<ProductRequirement[]> {
    return this.repository.listProductRequirements(productVersionId);
  }

  // ==========================================================================
  // Stage 3 — Functional Specifications (MVP1 item 11)
  // ==========================================================================

  async listFunctionalSpecifications(
    productVersionId: string,
  ): Promise<FunctionalSpecification[]> {
    return this.repository.listFunctionalSpecifications(productVersionId);
  }

  /**
   * Derives one functional specification item per bound requirement.
   *
   * `TARGET_OPERATING_MODEL.md` §Stage 3: "an approved UAS produces a
   * Functional Specification whose items each trace to at least one
   * requirement". Derived, not authored, because the input already exists —
   * `bindUrsBaseline` has copied every pinned requirement into
   * `product_requirements`, and an FS item is the statement of what the system
   * must do to satisfy one of them.
   *
   * **It derives from the snapshot, never from the live URS.** The product
   * keeps the wording it was built against (§1.7 requirement provenance), so an
   * FS generated from a later revision would describe a product nobody
   * released.
   *
   * **Idempotent, and additive only.** Re-running after a rebind writes items
   * for requirements that have none and leaves the rest untouched: an existing
   * item may have been edited by a human, and silently overwriting a reviewed
   * specification is the opposite of what Stage 3 is for. The unique index on
   * (product_version_id, urs_requirement_version_id) is the same rule in the
   * database, per NXD-009 — the service check cannot close the race between two
   * concurrent derivations.
   *
   * **Refused on a version with no baseline.** There is nothing to derive from,
   * and an empty FS would read as "specified, nothing required" rather than
   * "not specified yet".
   */
  async deriveFunctionalSpecifications(
    productVersionId: string,
    actor: string,
    inheritedAudit?: AuditContext,
  ): Promise<FunctionalSpecification[]> {
    const audit = this.beginAudit(actor, inheritedAudit);
    // Not-found, then status, then domain state — the same order
    // `bindUrsBaseline` uses. A version that is not DRAFT gets the status
    // refusal even if it also has no baseline, because that is the first thing
    // the caller has to fix.
    const version = await this.requireDraftVersion(
      productVersionId,
      'A functional specification can only be derived while the version is ' +
        'DRAFT — what a version specifies is part of what was approved.',
    );
    if (!version.ursBaselineId) {
      throw new ConflictError(
        `Product version ${productVersionId} has no URS baseline bound. ` +
          'A functional specification is derived from the requirements the ' +
          'version was built against, so there is nothing to derive from yet.',
      );
    }

    const requirements =
      await this.repository.listProductRequirements(productVersionId);
    const existing =
      await this.repository.listFunctionalSpecifications(productVersionId);
    const alreadySpecified = new Set(
      existing.map(spec => spec.ursRequirementVersionId),
    );

    const created: FunctionalSpecification[] = [];
    for (const requirement of requirements) {
      if (alreadySpecified.has(requirement.ursRequirementVersionId)) {
        continue;
      }
      const spec: FunctionalSpecification = {
        id: randomUUID(),
        productVersionId,
        ursRequirementVersionId: requirement.ursRequirementVersionId,
        fsCode: functionalSpecCode(requirement.requirementRef),
        title: requirement.title,
        // The requirement's own statement is the honest starting point. It is
        // not yet a functional specification and this does not pretend
        // otherwise — it is the derivation the audit item asks for, with the
        // requirement it must satisfy named in the text so an author editing it
        // can see what they are specifying against.
        description:
          `Functional specification for ${requirement.requirementRef}.\n\n` +
          `${requirement.statement ?? requirement.title}`,
        createdBy: actor,
        createdAt: new Date(),
      };
      await this.repository.createFunctionalSpecification(spec);
      created.push(spec);
    }

    if (created.length > 0) {
      await this.audit(
        audit,
        'FUNCTIONAL_SPEC',
        productVersionId,
        'FUNCTIONAL_SPECIFICATION_DERIVED',
        {
          newValue: JSON.stringify({
            ursBaselineId: version.ursBaselineId,
            derived: created.length,
            alreadyPresent: existing.length,
            fsCodes: created.map(spec => spec.fsCode),
          }),
        },
      );
    }

    return created;
  }

  /**
   * Resolves URS ↔ FS ↔ Component for one product version.
   *
   * The chain the audit's G-7 names as missing, made answerable: for each FS
   * item, which requirement it specifies and which components implement that
   * requirement.
   *
   * **Computed, not stored.** The requirement end is a column on the FS row;
   * the component end is the existing `IMPLEMENTS` link from the requirement.
   * Materialising FS→Component links as a third copy of the same fact would let
   * the copies disagree the moment a component link changed — and the direct
   * requirement→component link has to stay regardless, because
   * `getRequirementCoverage` and the release gate read it. Stage 3 is additive
   * here: it does not become a mandatory hop in this slice, which would flip
   * every coverage row to UNMAPPED.
   *
   * An explicitly written `FUNCTIONAL_SPEC → PRODUCT_COMPONENT` link is
   * honoured too, and unioned in — the vocabulary admits one so that a designer
   * can state a mapping the requirement does not already imply.
   */
  async getFunctionalSpecTrace(
    productVersionId: string,
  ): Promise<FunctionalSpecificationTraceRow[]> {
    const version = await this.repository.getProductVersion(productVersionId);
    if (!version) {
      throw new NotFoundError(`Product version ${productVersionId} not found`);
    }

    const [specs, requirements, components] = await Promise.all([
      this.repository.listFunctionalSpecifications(productVersionId),
      this.repository.listProductRequirements(productVersionId),
      this.repository.listProductComponents(productVersionId),
    ]);

    const componentIds = new Set(components.map(component => component.id));
    // Both filters below require the target to be one of these components,
    // so links touching them are a superset of everything either can accept.
    const allLinks = await this.repository.listTraceabilityLinks([
      ...componentIds,
    ]);
    const byVersionId = new Map(
      requirements.map(requirement => [
        requirement.ursRequirementVersionId,
        requirement,
      ]),
    );

    return specs.map(spec => {
      const requirement = byVersionId.get(spec.ursRequirementVersionId);
      // Both keys, for the same reason coverage joins on both: links written
      // before the snapshot existed carry whichever id the author had to hand.
      const keys = new Set(
        [spec.ursRequirementVersionId, requirement?.requirementRef].filter(
          (key): key is string => Boolean(key),
        ),
      );
      const viaRequirement = allLinks.filter(
        link =>
          keys.has(link.sourceId) &&
          link.relationshipType === 'IMPLEMENTS' &&
          componentIds.has(link.targetId),
      );
      const viaSpec = allLinks.filter(
        link =>
          link.sourceType === 'FUNCTIONAL_SPEC' &&
          link.sourceId === spec.id &&
          componentIds.has(link.targetId),
      );

      return {
        fsCode: spec.fsCode,
        functionalSpecId: spec.id,
        title: spec.title,
        requirementRef: requirement?.requirementRef,
        ursRequirementVersionId: spec.ursRequirementVersionId,
        componentIds: [
          ...new Set(
            [...viaRequirement, ...viaSpec].map(link => link.targetId),
          ),
        ],
      };
    });
  }

  /**
   * Requirement coverage for one Product Version — the regulated question.
   *
   * `getProductTraceability` answers "does every component trace to
   * something?", which is a housekeeping check. This answers "is every
   * requirement implemented, verified and validated?", which is the
   * traceability matrix GAMP 5 asks for and which nothing could compute before
   * requirements existed on the product side.
   *
   * Two independent axes, per `NEXORA_STRATEGY.md` ("Engineering Verification
   * and formal Pharma Validation are separate but traceable"):
   *
   *  - **mapped / verified** from this plugin's own `traceability_links`,
   *    joined on either the stable requirement id or the version UUID, because
   *    links predating this slice were hand-typed and used whichever the
   *    author had to hand.
   *  - **validated** from the Validation Expert, keyed on the stable id.
   *    Absent rather than false when no context resolves (Slice 1b).
   */
  async getRequirementCoverage(
    productVersionId: string,
  ): Promise<ProductRequirementCoverage> {
    const version = await this.repository.getProductVersion(productVersionId);
    if (!version) {
      throw new NotFoundError(`Product version ${productVersionId} not found`);
    }

    const requirements =
      await this.repository.listProductRequirements(productVersionId);
    const components =
      await this.repository.listProductComponents(productVersionId);
    const componentIds = new Set(components.map(component => component.id));
    // `linked` below requires the target to be one of these components, and
    // nothing reads the requirement links before that filter.
    const allLinks = await this.repository.listTraceabilityLinks([
      ...componentIds,
    ]);

    // MVP1-B (B-4c). Evidence rows for every key this version's requirements
    // answer to. Both keys, because `ingestTestExecution` accepts either and
    // the links below join on either — asking for only one would make
    // evidence invisible depending on which id CI had to hand.
    const requirementKeys = requirements.flatMap(requirement => [
      requirement.ursRequirementVersionId,
      requirement.requirementRef,
    ]);
    const executions = await this.repository.listTestExecutions(
      requirementKeys,
    );
    // Grouped by the key CI posted against, not by link. A failing run
    // produces no VERIFIED_BY link — that would be a contradiction in terms —
    // so a coverage rule that reached the evidence only through links could
    // never see a failure, and the revocation below would never fire. The
    // link remains the traceability artefact; the *decision* reads the rows.
    const executionsByKey = new Map<string, TestExecution[]>();
    for (const execution of executions) {
      const held = executionsByKey.get(execution.requirementVersionId);
      if (held) {
        held.push(execution);
      } else {
        executionsByKey.set(execution.requirementVersionId, [execution]);
      }
    }

    // Slice 1b: ask the Validation Expert once, not once per requirement.
    let validation: ValidationCoverageSummary | undefined;
    if (version.ursBaselineId && this.validationDecisionResolver?.getValidationCoverage) {
      try {
        validation = await this.validationDecisionResolver.getValidationCoverage(
          version.ursBaselineId,
          version.id,
        );
      } catch (error) {
        // Unreachable is not "nothing is validated" — leave it undefined so
        // the row renders as unknown and say why in the log.
        this.logger.warn(
          `Could not resolve validation coverage for URS baseline ` +
            `${version.ursBaselineId}: ` +
            `${error instanceof Error ? error.message : String(error)}. ` +
            `Requirement rows will report validation as unknown.`,
        );
      }
    }

    const byRequirement: ProductRequirementCoverageRow[] = requirements.map(
      requirement => {
        const keys = new Set([
          requirement.requirementRef,
          requirement.ursRequirementVersionId,
        ]);
        const fromThisRequirement = allLinks.filter(link =>
          keys.has(link.sourceId),
        );
        const linked = fromThisRequirement.filter(link =>
          componentIds.has(link.targetId),
        );
        const implementing = linked.filter(
          link => link.relationshipType === 'IMPLEMENTS',
        );
        const verifyingComponentLinks = linked.filter(
          link => link.relationshipType === 'VERIFIED_BY',
        );

        // B-4c. Every run recorded against either key for this
        // requirement, reduced to the newest per test case.
        const requirementRuns = [...keys].flatMap(
          key => executionsByKey.get(key) ?? [],
        );
        const currentRuns = latestExecutionPerCase(requirementRuns);
        const allCurrentPassed =
          currentRuns.length > 0 &&
          currentRuns.every(run => run.status === 'PASSED');

        const validationRow = validation?.byRequirement.get(
          requirement.requirementRef,
        );
        const testIds = validationRow?.testIds ?? [];

        // Where there is execution evidence it decides, and a newer FAILED
        // run revokes the verification — including one a component link or
        // the Validation Expert would otherwise have granted. That is the
        // conservative reading and the one a QA reviewer expects: the
        // question is not "did this ever pass" but "does it pass now".
        // Where there is none, the two older sources still answer.
        const verified =
          currentRuns.length > 0
            ? allCurrentPassed
            : verifyingComponentLinks.length > 0 || testIds.length > 0;

        return {
          requirementRef: requirement.requirementRef,
          ursRequirementVersionId: requirement.ursRequirementVersionId,
          title: requirement.title,
          gxpRelevance: requirement.gxpRelevance,
          origin: requirement.origin,
          mapping: implementing.length > 0 ? 'MAPPED' : 'UNMAPPED',
          componentIds: implementing.map(link => link.targetId),
          verified,
          executions: currentRuns.map(run => ({
            id: run.id,
            testSuite: run.testSuite,
            testCase: run.testCase,
            status: run.status,
            executedAt: run.executedAt,
            executionArtifactUrl: run.executionArtifactUrl,
          })),
          testIds,
          runIds: validationRow?.runIds ?? [],
          findingIds: validationRow?.findingIds ?? [],
          validated: validation
            ? validation.decisionApproved && testIds.length > 0
            : undefined,
        };
      },
    );

    return {
      productVersionId,
      ursBaselineId: version.ursBaselineId,
      total: byRequirement.length,
      mapped: byRequirement.filter(row => row.mapping === 'MAPPED').length,
      unmapped: byRequirement.filter(row => row.mapping === 'UNMAPPED').length,
      verified: byRequirement.filter(row => row.verified).length,
      validated: byRequirement.filter(row => row.validated === true).length,
      validationContextId: validation?.contextId,
      byRequirement,
    };
  }

  async createTraceabilityLink(
    request: CreateTraceabilityLinkRequest,
    actor: string,
    inheritedAudit?: AuditContext,
  ): Promise<TraceabilityLink> {
    const audit = this.beginAudit(actor, inheritedAudit);
    const issues = validateTraceabilityLink(request);
    if (issues.length > 0) {
      // Was a plain Error, so a caller's typo answered 500 "Internal server
      // error". Same family as the three refusals B-1 retyped.
      throw new InputError(issues.join('; '));
    }
    await this.assertTraceabilityEndpointsExist(request);
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
    await this.audit(audit, 'TRACEABILITY_LINK', link.id, 'TRACEABILITY_LINK_CREATED');
    return link;
  }

  async deleteTraceabilityLink(id: string, actor: string): Promise<void> {
    const audit = this.beginAudit(actor);
    // This deleted blind: no lookup, 204 for an id that never existed, and an
    // audit event recording a deletion that did not happen. The 200-for-an-
    // unknown-id half is the same shape as the three URS routes slice B-1
    // closed; the audit half is worse, because a trail that claims an act
    // nobody performed is not a gap in the record but a false entry in it.
    // No status guard on purpose — see NXD-072. The right rule for removing a
    // link on a released version is about evidence, not about version status.
    const existing = await this.repository.getTraceabilityLink(id);
    if (!existing) {
      throw new NotFoundError(`Traceability link ${id} not found`);
    }
    await this.repository.deleteTraceabilityLink(id);
    await this.audit(audit, 'TRACEABILITY_LINK', id, 'TRACEABILITY_LINK_DELETED');
  }

  async transitionProductVersionStatus(
    versionId: string,
    request: TransitionProductVersionRequest,
    actor: string,
  ): Promise<ProductVersion> {
    const audit = this.beginAudit(actor);
    const version = await this.repository.getProductVersion(versionId);
    if (!version) {
      throw new NotFoundError(`Product version ${versionId} not found`);
    }
    const allowed = VALID_TRANSITIONS[version.status] ?? [];
    if (!allowed.includes(request.targetStatus)) {
      throw new ConflictError(
        `Invalid transition from ${version.status} to ${request.targetStatus}`,
      );
    }
    if (request.targetStatus === 'RELEASED') {
      const gate = await this.checkReleaseGate(versionId);
      if (!gate.passed) {
        // A blocked gate is the platform working, not failing. 409 says
        // "the version is not in a state that permits this", which is
        // exactly what a standing blocker means.
        throw new ConflictError(
          `Release gate failed: ${gate.blockers.map(b => b.code).join(', ')}`,
        );
      }
    }

    // Phase 5 (P5-S2): Segregation of Duties on APPROVED transition.
    // The person who approves a version must not be the same person who
    // created it. Approval by the author of a version is self-approval and
    // is not admissible in a GxP context.
    //
    // 403, not 400 (NXD-072). This is a statement about who the caller is, not
    // about what they sent: there is no correction to the request body that
    // makes it succeed, and a 400 invites the author to go looking for one.
    if (request.targetStatus === 'APPROVED' && actor === version.createdBy) {
      throw new NotAllowedError(
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
    await this.audit(audit, 'PRODUCT_VERSION', versionId, 'STATUS_TRANSITION', {
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
      throw new NotFoundError(`Product version ${versionId} not found`);
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
    const componentIds = new Set(components.map(c => c.id));
    const allLinks = await this.repository.listTraceabilityLinks([
      ...componentIds,
    ]);
    const linkedComponentIds = new Set(
      allLinks
        .filter(l => componentIds.has(l.sourceId) || componentIds.has(l.targetId))
        .map(l => (componentIds.has(l.sourceId) ? l.sourceId : l.targetId)),
    );
    for (const comp of components) {
      if (!linkedComponentIds.has(comp.id)) {
        // MVP1-B (B-4c): this check kept its behaviour and lost its name.
        // It asks whether a component traces to anything at all, which is a
        // real question but not the regulated one, and calling it
        // INCOMPLETE_TRACEABILITY meant a single link anywhere satisfied a
        // blocker a reader took for requirement coverage.
        blockers.push({
          code: 'UNTRACED_COMPONENT',
          message: `Component ${comp.name} (${comp.id}) has no traceability link`,
        });
        break;
      }
    }

    // The regulated question: is every requirement this version implements
    // actually verified? The coverage report has answered it since Slice 1b
    // and the gate never asked. A product could therefore reach RELEASED
    // with a verification count of zero.
    //
    // Only when a URS baseline is bound. Unbound is already answered by
    // NO_URS_BASELINE below, and two blockers for one cause is what makes a
    // gate unreadable.
    if (version.ursBaselineId) {
      const coverage = await this.getRequirementCoverage(versionId);
      if (coverage.verified < coverage.total) {
        const unverified = coverage.byRequirement
          .filter(row => !row.verified)
          .map(row => row.requirementRef);
        // Naming them is the difference between a blocker someone can act on
        // and one they have to go and investigate. Capped, because a large
        // baseline would otherwise produce a message nobody reads.
        const named = unverified.slice(0, 10).join(', ');
        const rest =
          unverified.length > 10
            ? ` and ${unverified.length - 10} more`
            : '';
        blockers.push({
          code: 'INCOMPLETE_TRACEABILITY',
          message:
            `${coverage.verified} of ${coverage.total} requirements are ` +
            `verified. Unverified: ${named}${rest}. A requirement is ` +
            'verified by a passing test execution, a VERIFIED_BY link to a ' +
            'component, or an executed Validation Expert protocol test — and ' +
            'a later failing run of the same test case revokes it.',
        });
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
          // Phase 5 closure (Slice 3). Evaluated here so the obligation is
          // discoverable with the others, but reported under its own blocker
          // code below rather than as POLICY_OBLIGATION_UNMET.
          'ci-provenance-recorded': () => Boolean(approvedBaseline?.provenance),
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
            // Build provenance gets its own code. Every other obligation on
            // this list is answered by a person filling something in; this one
            // is answered by a release build running, and a reviewer reading
            // the blocker list needs to see that difference without parsing
            // the message text. The gate never *records* provenance itself —
            // only CI can, which is the point of the whole slice.
            blockers.push({
              code:
                obl.check === 'ci-provenance-recorded'
                  ? 'MISSING_CI_PROVENANCE'
                  : 'POLICY_OBLIGATION_UNMET',
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
      // NXD-119. A GMP-relevant product (anything but an explicit NONE) needs
      // a decision under the GMP rule: the validation expert's and QA's
      // signatures. Otherwise a product could ride on a baseline that was
      // approved with one signature while no GMP product depended on it.
      const gmpProduct = product.gxpRelevance !== 'NONE';
      for (const ursId of ursBaselineIds) {
        try {
          const resolver = this.validationDecisionResolver;
          // A resolver without getDecisionApproval predates NXD-119; its
          // approval is taken as complete, as it was before.
          let approval: 'APPROVED_GMP' | 'APPROVED' | 'NONE';
          if (resolver.getDecisionApproval) {
            // NXD-127: the decision for this version, not for the baseline.
            approval = await resolver.getDecisionApproval(ursId, versionId);
          } else {
            approval = (await resolver.hasApprovedDecision(ursId, versionId))
              ? 'APPROVED_GMP'
              : 'NONE';
          }
          const approved = approval !== 'NONE';
          if (approved && gmpProduct && approval !== 'APPROVED_GMP') {
            blockers.push({
              code: 'VALIDATION_DECISION_NOT_GMP',
              message:
                `URS baseline ${ursId} was approved with a single signature. ` +
                'This product is GMP-relevant, so its validation needs the ' +
                'validation expert and QA (NXD-119).',
            });
          }
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
    inheritedAudit?: AuditContext,
  ): Promise<ProductBaseline> {
    const audit = this.beginAudit(actor, inheritedAudit);
    const version = await this.repository.getProductVersion(productVersionId);
    if (!version) {
      throw new NotFoundError(`Product version ${productVersionId} not found`);
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
    const links = (
      await this.repository.listTraceabilityLinks(components.map(c => c.id))
    ).filter(
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
      // Inherit the version's binding when the caller states none.
      //
      // Slice 1a. Until now the only writer of this field was `applySpecDraft`,
      // so `NO_URS_BASELINE` and the `urs-baseline-bound` policy obligation —
      // both written, both tested — could only ever fire on the AI path. A
      // baseline taken of a bound version now carries what that version
      // implements, which is what makes the gate reachable from the normal
      // path. An explicit `ursBaselineIds` still wins: the caller may be
      // recording a version bound before this existed.
      ursBaselineIds:
        request.ursBaselineIds ??
        (version.ursBaselineId ? [version.ursBaselineId] : undefined),
      createdBy: actor,
      createdAt: new Date(),
      revision: 1,
    };
    await this.repository.createProductBaseline(baseline);
    await this.audit(audit, 'PRODUCT_BASELINE', baseline.id, 'BASELINE_CREATED', {
      newValue: JSON.stringify({ snapshotChecksum: `sha256:${snapshotChecksum}` }),
    });
    return baseline;
  }

  async approveProductBaseline(
    baselineId: string,
    actor: string,
  ): Promise<ProductBaseline> {
    const audit = this.beginAudit(actor);
    const baseline = await this.repository.getProductBaseline(baselineId);
    if (!baseline) {
      throw new NotFoundError(`Product baseline ${baselineId} not found`);
    }
    if (baseline.status !== 'DRAFT') {
      throw new ConflictError(
        `Cannot approve baseline in status ${baseline.status}`,
      );
    }

    // Segregation of Duties, the same rule P5-S2 put on the APPROVED
    // transition and the same one every URS signature enforces. It was missing
    // here, and the gap was visible rather than theoretical: driving the
    // journey on 2026-09-25 showed one identity creating a ProductBaseline and
    // approving it in the next call, clearing NO_APPROVED_BASELINE on its own.
    //
    // A ProductBaseline is the controlled snapshot the release gate reads. An
    // approval the author can grant themselves is a record of one person's
    // opinion, not of a review, and it is exactly what an inspector would look
    // for. See NXD-059, finding 2. 403 rather than 400 since NXD-072, for the
    // reason given at the version transition above.
    if (actor === baseline.createdBy) {
      throw new NotAllowedError(
        `Segregation of Duties violation: the author of a product baseline ` +
          `cannot approve it. Actor "${actor}" created baseline ${baselineId}. ` +
          `A different person must perform the approval.`,
      );
    }

    const approved: ProductBaseline = {
      ...baseline,
      status: 'APPROVED',
      approvedBy: actor,
      approvedAt: new Date(),
    };
    await this.repository.updateProductBaseline(approved);
    await this.audit(audit, 'PRODUCT_BASELINE', baselineId, 'BASELINE_APPROVED');
    return approved;
  }

  /**
   * Records what CI built, against the baseline that describes it.
   *
   * Phase 5 closure (Slice 3). The caller is the release pipeline, not a
   * person: the router admits only a service principal here, which is why
   * `actor` is a service ref rather than a `user:default/...`.
   *
   * Three rules, each with a reason a reviewer will ask about:
   *
   * - **Write-once.** Re-posting the same evidence succeeds and changes
   *   nothing, because a retried CI job is normal and should not need to know
   *   whether its predecessor got through. Posting *different* evidence is a
   *   409: only one artifact was validated against this baseline, and quietly
   *   replacing the SHA would make the record describe a build nobody checked.
   * - **Not on a superseded baseline.** A superseded baseline is a historical
   *   record. Attaching a new build to it would attach evidence to a
   *   controlled document that has already been replaced.
   * - **Approval status is irrelevant.** Provenance may land on a DRAFT or an
   *   APPROVED baseline, because the release build usually runs *after*
   *   approval. This is not an edit to the controlled content — the snapshot
   *   and its checksum are untouched — it is an append of a fact about a build.
   */
  async recordBaselineProvenance(
    baselineId: string,
    request: { releaseCommitSha?: unknown; artifactDigest?: unknown },
    actor: string,
  ): Promise<ProductBaseline> {
    const audit = this.beginAudit(actor);
    const baseline = await this.repository.getProductBaseline(baselineId);
    if (!baseline) {
      throw new NotFoundError(`Product baseline ${baselineId} not found`);
    }

    const issues = validateReleaseProvenance(request);
    if (issues.length > 0) {
      throw new InputError(issues.join('; '));
    }

    // Safe after validation: both are non-empty strings or we threw above.
    const incoming = {
      releaseCommitSha: String(request.releaseCommitSha).trim().toLowerCase(),
      artifactDigest: String(request.artifactDigest).trim().toLowerCase(),
    };

    if (baseline.status === 'SUPERSEDED') {
      throw new ConflictError(
        `Baseline ${baselineId} is SUPERSEDED. Record provenance against the ` +
          'baseline that replaced it — a superseded baseline is a historical ' +
          'record and does not acquire new evidence.',
      );
    }

    const existing = baseline.provenance;
    if (existing) {
      if (isSameProvenance(existing, incoming)) {
        // Idempotent: a re-run of the same build. Nothing to write, nothing
        // to audit — an audit trail that records non-events is harder to read.
        return baseline;
      }
      throw new ConflictError(
        `Baseline ${baselineId} already carries provenance for commit ` +
          `${existing.releaseCommitSha} (${existing.artifactDigest}). Release ` +
          'provenance is write-once: create a new baseline for a new build ' +
          'rather than re-pointing this one.',
      );
    }

    const provenance: ReleaseProvenance = {
      ...incoming,
      provenanceTimestamp: new Date().toISOString(),
      provenanceRecordedBy: actor,
    };
    const updated: ProductBaseline = { ...baseline, provenance };
    await this.repository.updateProductBaseline(updated);
    await this.audit(audit, 'PRODUCT_BASELINE', baselineId, 'PROVENANCE_RECORDED', {
      newValue: JSON.stringify(provenance),
    });
    return { ...updated, revision: (baseline.revision || 1) + 1 };
  }

  /**
   * Record one test result and, if it passed, say so in the trace.
   *
   * MVP1-B (Slice B-4b), audit items 2 and 3. Until now the only thing that
   * could mark a requirement verified was a hand-written `VERIFIED_BY` link
   * or the Validation Expert — so on the normal path a product reached the
   * release gate with a verification count of zero and no way to raise it.
   * This is the door CI writes through.
   *
   * Shaped after `recordBaselineProvenance`: a service principal, a
   * validator in `platform-common`, one `InputError` for the whole body. It
   * differs in one way that matters — provenance is write-once and a second
   * differing POST is a conflict, while a second test run is **not** a
   * conflict. It is the next run, and it is appended.
   *
   * The link is derived rather than requested. A caller that could post a
   * result and separately assert a `VERIFIED_BY` link could assert one
   * without the result; deriving it means the claim and the evidence are
   * written in the same operation or neither is.
   */
  /**
   * Import the test evidence of the product repository's newest completed CI
   * run as test executions of this version's requirements (NXD-123).
   *
   * The CI of a Golden Path uploads its per-test outcomes, each naming the
   * URS requirement ids it verifies (NXD-122). Those ids are matched against
   * the requirements bound to this version; each match becomes one execution
   * through `ingestTestExecution`, with the CI run as its artifact. A skipped
   * test is not evidence and is not recorded; an error is a failure. Re-running
   * the import for the same CI run records nothing twice.
   */
  async importTestEvidence(
    productVersionId: string,
    actor: string,
  ): Promise<{
    run: { id: number; url: string; commit: string; conclusion: string | null };
    imported: number;
    skipped: number;
    alreadyRecorded: number;
    byRequirement: Record<string, { passed: number; failed: number }>;
    uncoveredRequirements: string[];
    unknownRequirements: string[];
  }> {
    if (!this.ciEvidenceClient) {
      throw new ConflictError('Test evidence import is not configured on this instance.');
    }
    const version = await this.repository.getProductVersion(productVersionId);
    if (!version) {
      throw new NotFoundError(`Product version ${productVersionId} not found`);
    }
    const product = await this.repository.getProduct(version.productId);
    if (!product?.repositoryUrl) {
      throw new ConflictError(
        'This product has no repository URL, so there is no CI to read evidence from.',
      );
    }
    const requirements = await this.repository.listProductRequirements(productVersionId);
    if (requirements.length === 0) {
      throw new ConflictError(
        'No URS baseline is bound to this version, so there is nothing to attach evidence to.',
      );
    }

    const evidence = await this.ciEvidenceClient.getLatestEvidence(product.repositoryUrl);
    if (!evidence.available || !evidence.run || !evidence.results) {
      const why: Record<string, string> = {
        'no-completed-run': 'the repository has no completed CI run yet',
        'no-evidence-artifact':
          'the newest CI run uploaded no nexora-test-evidence artifact (or it expired)',
        inaccessible: 'Nexora cannot read the repository’s CI',
        'not-found': 'the repository or its CI workflow was not found',
      };
      throw new ConflictError(
        `No test evidence to import: ${why[evidence.reason ?? ''] ?? evidence.reason ?? 'unknown'}.`,
      );
    }

    const byRef = new Map(requirements.map(r => [r.requirementRef, r]));
    const versionIds = requirements.map(r => r.ursRequirementVersionId);
    const existing = await this.repository.listTestExecutions(versionIds);
    const recorded = new Set(
      existing
        .filter(e => e.executionArtifactUrl === evidence.run!.url)
        .map(e => `${e.requirementVersionId} ${e.testCase}`),
    );
    const correlationId = randomUUID();
    const byRequirement: Record<string, { passed: number; failed: number }> = {};
    const unknown = new Set<string>();
    let imported = 0;
    let skipped = 0;
    let alreadyRecorded = 0;

    for (const result of evidence.results) {
      if (result.outcome === 'skipped') {
        skipped++;
        continue;
      }
      for (const ref of result.requirements) {
        const requirement = byRef.get(ref);
        if (!requirement) {
          unknown.add(ref);
          continue;
        }
        const key = `${requirement.ursRequirementVersionId} ${fitColumn(result.testCase)}`;
        if (recorded.has(key)) {
          alreadyRecorded++;
          continue;
        }
        const passed = result.outcome === 'passed';
        await this.ingestTestExecution(
          {
            requirementVersionId: requirement.ursRequirementVersionId,
            // The module, not the CI step: a step's pytest invocation lists
            // every file it runs and overflowed the 255-character column on
            // PostgreSQL (SQLite does not enforce the length).
            testSuite: fitColumn(result.testCase.split('::')[0] || result.suite),
            testCase: fitColumn(result.testCase),
            status: passed ? 'PASSED' : 'FAILED',
            executedAt: evidence.run.completedAt,
            executionArtifactUrl: evidence.run.url,
            correlationId,
          },
          actor,
        );
        recorded.add(key);
        imported++;
        const tally = (byRequirement[ref] ??= { passed: 0, failed: 0 });
        if (passed) tally.passed++;
        else tally.failed++;
      }
    }

    const evidenced = new Set(
      evidence.results.filter(r => r.outcome !== 'skipped').flatMap(r => r.requirements),
    );
    return {
      run: {
        id: evidence.run.id,
        url: evidence.run.url,
        commit: evidence.run.commit,
        conclusion: evidence.run.conclusion,
      },
      imported,
      skipped,
      alreadyRecorded,
      byRequirement,
      uncoveredRequirements: requirements
        .map(r => r.requirementRef)
        .filter(ref => !evidenced.has(ref)),
      unknownRequirements: [...unknown].sort(),
    };
  }

  async ingestTestExecution(
    request: {
      requirementVersionId?: unknown;
      testSuite?: unknown;
      testCase?: unknown;
      status?: unknown;
      executedAt?: unknown;
      executionArtifactUrl?: unknown;
      correlationId?: unknown;
    },
    actor: string,
  ): Promise<{ execution: TestExecution; verifiedByLinkId?: string }> {
    const issues = validateTestExecution(request);
    if (issues.length > 0) {
      throw new InputError(issues.join('; '));
    }

    // A CI run posting results for twelve requirements is one operation, and
    // adopting the caller's id is what makes it one in the trail. This is the
    // cross-plugin thread NXD-065 left open: the id is generated at a service
    // boundary and nothing carried it across. Validated as non-empty above,
    // so an empty string cannot become the correlation for a whole run.
    const supplied =
      typeof request.correlationId === 'string'
        ? request.correlationId.trim()
        : '';
    const audit = this.beginAudit(
      actor,
      supplied ? { correlationId: supplied, actor } : undefined,
    );

    const requirementVersionId = String(request.requirementVersionId).trim();
    const known =
      await this.repository.requirementReferenceExists(requirementVersionId);
    if (!known) {
      throw new NotFoundError(
        `Requirement ${requirementVersionId} is in no product version's bound ` +
          'URS baseline snapshot. Bind the baseline that contains it before ' +
          'posting evidence against it.',
      );
    }

    const execution: TestExecution = {
      id: randomUUID(),
      requirementVersionId,
      testSuite: String(request.testSuite).trim(),
      testCase: String(request.testCase).trim(),
      status: String(request.status) as TestExecution['status'],
      // CI knows when the test ran; the platform only knows when it heard.
      // Prefer the former, fall back to the latter rather than refusing —
      // the timestamp orders the runs, and an absent one is not a reason to
      // drop evidence on the floor.
      executedAt: request.executedAt
        ? new Date(request.executedAt as string)
        : new Date(),
      executionArtifactUrl: request.executionArtifactUrl
        ? String(request.executionArtifactUrl).trim()
        : undefined,
      correlationId: audit.correlationId,
      createdBy: actor,
      createdAt: new Date(),
    };
    await this.repository.createTestExecution(execution);
    await this.audit(
      audit,
      'TEST_EXECUTION',
      execution.id,
      'TEST_EXECUTION_INGESTED',
      {
        newValue: JSON.stringify({
          requirementVersionId: execution.requirementVersionId,
          testSuite: execution.testSuite,
          testCase: execution.testCase,
          status: execution.status,
        }),
      },
    );

    if (execution.status !== 'PASSED') {
      // No link, and no deletion of an earlier one. The run that passed
      // yesterday genuinely passed; erasing its link would rewrite history to
      // make today's failure tidier. The gate reads current status through
      // the links instead — see `getRequirementCoverage`.
      return { execution };
    }

    const link = await this.createTraceabilityLink(
      {
        sourceType: 'URS_REQUIREMENT_VERSION',
        sourceId: execution.requirementVersionId,
        relationshipType: 'VERIFIED_BY',
        targetType: 'TEST_EXECUTION',
        targetId: execution.id,
      },
      actor,
      audit,
    );

    return { execution, verifiedByLinkId: link.id };
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
      throw new NotFoundError(`Product baseline ${baselineId} not found`);
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

  /**
   * Assembles the evidence package for one product version.
   *
   * Composition only — every call below is an existing read, and this method
   * adds no query the platform could not already answer. What it adds is that
   * the answers arrive together.
   *
   * The release gate is included deliberately, passing or not. A package that
   * omitted its blockers would be a sales document; the interesting case for
   * an inspector is a version that is *not* releasable and can say precisely
   * why.
   *
   * Two audit trails are merged, `PRODUCT_VERSION` and `PRODUCT`. Only the
   * former had a route; the acts that created and governed the product itself
   * were recorded and unreachable.
   */
  async buildEvidencePackage(
    productVersionId: string,
  ): Promise<ProductEvidencePackage> {
    const version = await this.repository.getProductVersion(productVersionId);
    if (!version) {
      throw new NotFoundError(
        `Product version ${productVersionId} not found`,
      );
    }
    const product = await this.repository.getProduct(version.productId);
    if (!product) {
      // A version without its product is a broken record, not an empty one.
      throw new NotFoundError(
        `Product ${version.productId} not found for version ${productVersionId}`,
      );
    }

    const components = await this.repository.listProductComponents(
      productVersionId,
    );
    const contracts: DataContract[] = [];
    for (const component of components) {
      contracts.push(...(await this.repository.listDataContracts(component.id)));
    }

    const componentIds = new Set(components.map(c => c.id));
    const specs = await this.repository.listFunctionalSpecifications(
      productVersionId,
    );
    const specIds = new Set(specs.map(s => s.id));
    const allLinks = await this.repository.listTraceabilityLinks([
      ...componentIds,
      ...specIds,
    ]);

    return {
      generatedAt: new Date(),
      product,
      version,
      ursBaselineId: version.ursBaselineId,
      requirements: await this.repository.listProductRequirements(
        productVersionId,
      ),
      coverage: await this.getRequirementCoverage(productVersionId),
      functionalSpecifications: specs,
      functionalSpecTrace: await this.getFunctionalSpecTrace(productVersionId),
      components,
      contracts,
      // Scoped to this version's own entities. `getProductTraceability` spans
      // every version of a product, which is the right answer for a lineage
      // view and the wrong one for a package about a single version.
      traceabilityLinks: allLinks.filter(
        link =>
          componentIds.has(link.sourceId) ||
          componentIds.has(link.targetId) ||
          specIds.has(link.sourceId) ||
          specIds.has(link.targetId),
      ),
      baselines: await this.repository.listProductBaselines(productVersionId),
      releaseGate: await this.checkReleaseGate(productVersionId),
      auditTrail: [
        ...(await this.repository.getEntityAuditTrail(
          'PRODUCT_VERSION',
          productVersionId,
        )),
        ...(await this.repository.getEntityAuditTrail('PRODUCT', product.id)),
      ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
      limits: EVIDENCE_PACKAGE_LIMITS,
    };
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
    const allLinks = await this.repository.listTraceabilityLinks([
      ...componentIds,
    ]);
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
    const audit = this.beginAudit(actor);
    if (!this.llmClient) {
      // Switched off by configuration, not broken. 501 says "this server
      // does not offer that", which a caller can act on; 500 said "the
      // platform is broken", which is the wording ae62aa4 went after.
      throw new NotImplementedError('AI suggestions are not enabled');
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

    await this.audit(audit, 'composition', 'ai-suggestion', 'AI_SUGGEST_COMPONENTS', {
      newValue: JSON.stringify({ productName, suggestionCount: suggestions.length }),
    });

    return suggestions;
  }

  async generateProductSpec(
    ursBaselineId: string,
    actor: string,
  ): Promise<AISpecDraft> {
    const audit = this.beginAudit(actor);
    if (!this.llmClient) {
      throw new NotImplementedError(
        'AI product spec generation is not enabled',
      );
    }
    if (!this.ursBaselineResolver) {
      // Distinct from the three above on purpose: nobody chose this. A
      // dependency this deployment was meant to have is absent, so it is
      // 503 and it is logged — an operator has to fix it, and a caller
      // retrying later is not unreasonable.
      throw new ServiceUnavailableError(
        'URS baseline resolver is not configured',
      );
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
      modelId: result.provenance.modelId,
      promptHash: result.provenance.promptHash,
      rawResponse: result.provenance.rawResponse,
      generatedBy: actor,
      generatedAt: new Date().toISOString(),
    };

    // Written before the audit event, and before the caller ever sees the id.
    // NXD-064 C-3 asks for drafts to be persisted *before they can be applied*;
    // a failure here must mean no draft rather than a draft the store does not
    // know about, which is what the in-process Map amounted to on every
    // restart.
    await this.repository.createSpecDraft(draft);

    await this.audit(audit, 'AI_SPEC_DRAFT', draft.id, 'AI_PRODUCT_SPEC_GENERATED', {
      newValue: JSON.stringify({
        ursBaselineId,
        productName: draft.productName,
        componentCount: draft.suggestedComponents.length,
        contractCount: draft.suggestedContracts.length,
        modelId: draft.modelId,
        promptHash: draft.promptHash,
      }),
    });

    return draft;
  }

  async getSpecDraft(id: string): Promise<AISpecDraft | undefined> {
    return (await this.repository.getSpecDraft(id)) ?? undefined;
  }

  async applySpecDraft(
    draftId: string,
    actor: string,
  ): Promise<Product> {
    const audit = this.beginAudit(actor);
    const draft = await this.repository.getSpecDraft(draftId);
    if (!draft) {
      throw new NotFoundError(`AI spec draft ${draftId} not found`);
    }
    if (draft.status !== 'PENDING_REVIEW') {
      throw new ConflictError(`Cannot apply draft in status ${draft.status}`);
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
      audit,
    );

    const version = await this.createProductVersion(
      product.id,
      { changelog: `Generated from URS baseline ${draft.ursBaselineId} via AI spec draft ${draftId}` },
      actor,
      audit,
    );

    // The changelog above is prose. Bind the baseline properly so the origin
    // is machine-readable, the requirements land on the version, and the
    // release gate's URS check can resolve it. One binding mechanism, not two:
    // this used to pass `ursBaselineIds` straight to the ProductBaseline,
    // which recorded the fact without ever bringing the requirements across.
    const { requirements } = await this.bindUrsBaseline(
      version.id,
      draft.ursBaselineId,
      actor,
      audit,
    );
    const requirementByRef = new Map(
      requirements.map(requirement => [requirement.requirementRef, requirement]),
    );

    for (const comp of draft.suggestedComponents) {
      const component = await this.addProductComponent(
        version.id,
        {
          componentType: toComponentType(comp.componentType),
          name: comp.name,
          description: comp.reason,
        },
        actor,
        audit,
      );

      // The prompt demands every suggested component reference at least one
      // requirement ("Every suggested component MUST reference at least one
      // URS requirement ID"), the draft carries them — and they were dropped
      // on the floor here, so the generated product failed its own release
      // gate on INCOMPLETE_TRACEABILITY. Now that requirements are rows, the
      // refs resolve to something. Refs the model invented match nothing and
      // are skipped rather than stored: an IMPLEMENTS link to a requirement
      // the baseline does not contain is worse than a missing one.
      for (const ref of comp.traceabilityRefs ?? []) {
        const requirement = requirementByRef.get(String(ref).trim());
        if (!requirement) {
          this.logger.warn(
            `AI spec draft ${draftId} referenced requirement ${ref} for ` +
              `component ${comp.name}, but URS baseline ` +
              `${draft.ursBaselineId} contains no such requirement. The link ` +
              `is not created.`,
          );
          continue;
        }
        await this.createTraceabilityLink(
          {
            sourceType: 'URS_REQUIREMENT_VERSION',
            sourceId: requirement.requirementRef,
            relationshipType: 'IMPLEMENTS',
            targetType: 'PRODUCT_COMPONENT',
            targetId: component.id,
          },
          actor,
          audit,
        );
      }
    }

    // Inherits `ursBaselineIds` from the version binding above. The baseline
    // stays DRAFT — approving it is a human act.
    await this.createProductBaseline(version.id, {}, actor, audit);

    // Persisted, not mutated in place. The Map held the same object the
    // caller had, so assigning to it was the whole update; against a store the
    // decision has to be written, and the product it produced is recorded with
    // it so a draft can say what it became.
    await this.repository.updateSpecDraftOutcome({
      id: draftId,
      status: 'APPLIED',
      appliedBy: actor,
      appliedAt: new Date().toISOString(),
      productId: product.id,
    });

    await this.audit(audit, 'AI_SPEC_DRAFT', draftId, 'AI_SPEC_APPLIED', {
      newValue: JSON.stringify({ productId: product.id, versionId: version.id }),
    });

    return product;
  }

  async rejectSpecDraft(
    draftId: string,
    actor: string,
  ): Promise<void> {
    const audit = this.beginAudit(actor);
    const draft = await this.repository.getSpecDraft(draftId);
    if (!draft) {
      throw new NotFoundError(`AI spec draft ${draftId} not found`);
    }
    if (draft.status !== 'PENDING_REVIEW') {
      throw new ConflictError(`Cannot reject draft in status ${draft.status}`);
    }

    await this.repository.updateSpecDraftOutcome({
      id: draftId,
      status: 'REJECTED',
    });

    await this.audit(audit, 'AI_SPEC_DRAFT', draftId, 'AI_SPEC_REJECTED');
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

  /**
   * Refuse a traceability link to something that is not there.
   *
   * The audit's completion item 4 — "validated references on
   * `traceability_links`". A link is the platform's claim that one thing
   * relates to another; a link to something that does not exist is not a
   * weak claim, it is a false one, and the release gate reads these rows.
   *
   * Two different standards, because the two kinds of endpoint are not
   * comparable:
   *
   *  - **Rows this schema owns** — components and test executions — must
   *    exist. There is no case where naming one that does not is anything
   *    but a mistake.
   *  - **URS requirement references** are checked only where the answer is
   *    knowable. `product_requirements` is a snapshot that exists once a
   *    baseline is bound; before that there is nothing to check against, and
   *    refusing the link would break a workflow the platform offers — the
   *    Architecture tab lets an author record that a component implements
   *    `URS-OEE-014` while the version is still unbound, and
   *    `getRequirementCoverage` is explicitly built to join links that
   *    predate the snapshot.
   *
   * So the requirement check is **scoped to the bound version** when there is
   * one. That refuses the case that actually matters — claiming a
   * requirement the bound baseline does not contain, which is the same thing
   * `applySpecDraft` already declines to write — without refusing a
   * provisional link on a version that has bound nothing yet.
   */
  /**
   * Load a product version and refuse unless it is still DRAFT.
   *
   * The rule is older than this helper; what is new is that the *server* holds
   * it. `ArchitectureTab.tsx` disabled the add-component form outside DRAFT and
   * said so in a doc comment — "The rule belongs in the service; until it is
   * there, the page at least does not offer it." An API client walked straight
   * past that, so the architecture of a RELEASED version could still be
   * changed. See NXD-072.
   *
   * `refusal` is required rather than defaulted on purpose. Five call sites
   * refuse for five different reasons — what a version is built from, what it
   * is made of, what it publishes, what it consumes, what it specifies — and a
   * single shared sentence would state none of them. Making it a parameter
   * means the next method that needs the guard has to say why, instead of
   * inheriting a sentence written for a different operation.
   *
   * Returns the version because every caller needs it anyway.
   */
  private async requireDraftVersion(
    versionId: string,
    refusal: string,
  ): Promise<ProductVersion> {
    const version = await this.repository.getProductVersion(versionId);
    if (!version) {
      throw new NotFoundError(`Product version ${versionId} not found`);
    }
    if (version.status !== 'DRAFT') {
      throw new ConflictError(
        `Product version ${version.version} is ${version.status}. ${refusal}`,
      );
    }
    return version;
  }

  private async assertTraceabilityEndpointsExist(
    request: CreateTraceabilityLinkRequest,
  ): Promise<void> {
    const missing = (end: string, type: string, id: string, what: string) =>
      new NotFoundError(
        `Traceability link ${end} ${type} ${id} does not exist: ${what}`,
      );

    let componentVersionId: string | undefined;
    let specVersionId: string | undefined;

    for (const [end, type, id] of [
      ['source', request.sourceType, request.sourceId],
      ['target', request.targetType, request.targetId],
    ] as const) {
      if (type === 'PRODUCT_COMPONENT') {
        const component = await this.repository.getProductComponent(id);
        if (!component) {
          throw missing(end, type, id, 'no such product component');
        }
        componentVersionId = component.productVersionId;
      } else if (type === 'TEST_EXECUTION') {
        const execution = await this.repository.getTestExecution(id);
        if (!execution) {
          throw missing(end, type, id, 'no such test execution');
        }
      } else if (type === 'FUNCTIONAL_SPEC') {
        // Stage 3. This row is ours, so it is checked like a component rather
        // than like a URS reference — there is no cross-plugin boundary to
        // excuse a softer rule, and NXD-067's third mechanism is the one that
        // runs on both dialects.
        const spec = await this.repository.getFunctionalSpecification(id);
        if (!spec) {
          throw missing(end, type, id, 'no such functional specification');
        }
        // A specification and the component it maps to must belong to the same
        // product version. Without this an FS could claim a component from
        // another product, and the trace would resolve to something the
        // reviewer never approved.
        specVersionId = spec.productVersionId;
      }
    }

    if (
      specVersionId &&
      componentVersionId &&
      specVersionId !== componentVersionId
    ) {
      throw new InputError(
        `Traceability link joins functional specification on product version ` +
          `${specVersionId} to a component on ${componentVersionId}. ` +
          'A specification and the component that implements it belong to the ' +
          'same product version.',
      );
    }

    // A link has at most one requirement end. The source is by far the
    // common case (`URS_REQUIREMENT -> PRODUCT_COMPONENT`); the target form
    // exists because the vocabulary admits it.
    let end: 'source' | 'target';
    let type: string;
    let id: string;
    if (
      request.sourceType === 'URS_REQUIREMENT_VERSION' ||
      request.sourceType === 'URS_REQUIREMENT'
    ) {
      [end, type, id] = ['source', request.sourceType, request.sourceId];
    } else if (request.targetType === 'URS_REQUIREMENT_VERSION') {
      [end, type, id] = ['target', request.targetType, request.targetId];
    } else {
      return;
    }

    if (componentVersionId) {
      const version =
        await this.repository.getProductVersion(componentVersionId);
      if (!version?.ursBaselineId) {
        // Unbound: the link is provisional and there is nothing to check it
        // against. Coverage will pick it up if and when a baseline that
        // contains this requirement is bound.
        return;
      }
      const snapshot =
        await this.repository.listProductRequirements(componentVersionId);
      const held = snapshot.some(
        requirement =>
          requirement.ursRequirementVersionId === id ||
          requirement.requirementRef === id,
      );
      if (!held) {
        throw missing(
          end,
          type,
          id,
          `URS baseline ${version.ursBaselineId}, bound to this product ` +
            'version, contains no such requirement',
        );
      }
      return;
    }

    // No component to scope by — a requirement linked to a test execution.
    // Any product version's snapshot counts: a requirement version is pinned
    // by many products, and evidence produced for one of them is evidence
    // about that requirement.
    const known = await this.repository.requirementReferenceExists(id);
    if (!known) {
      throw missing(
        end,
        type,
        id,
        'no product version has this requirement in its bound URS baseline ' +
          'snapshot',
      );
    }
  }

  /**
   * Open the audit context for one service operation.
   *
   * Pass `inherited` when the method can also be reached from another
   * auditing method. `applySpecDraft` is the case that exists today: it
   * creates a product, a version, components, traceability links and a
   * baseline, each of which audits on its own, and all of those events belong
   * to the one act of applying the draft — not to five unrelated operations.
   *
   * Generating the id here rather than per event is the whole mechanism: one
   * operation, one id, however many events and however deep the call. This is
   * NXD-065's design, ported to the product side where `audit()` previously
   * minted a fresh `randomUUID()` per event and joined nothing.
   */
  private beginAudit(actor: string, inherited?: AuditContext): AuditContext {
    return inherited ?? { correlationId: randomUUID(), actor };
  }

  /**
   * Write one audit event within an operation.
   *
   * The correlation id comes from the context and cannot be passed in — there
   * is no parameter for it. A site that wants a different correlation has to
   * open a different context, which is a deliberate act rather than a slip.
   * The actor comes from the context too, so an event cannot be attributed to
   * someone other than the operation's actor by accident.
   */
  private async audit(
    ctx: AuditContext,
    entityType: string,
    entityId: string,
    eventType: string,
    options?: {
      oldValue?: string;
      newValue?: string;
      reason?: string;
      entityVersion?: number;
    },
  ): Promise<void> {
    this.logger.info(
      `[composer] ${eventType} ${entityType}:${entityId} by ${ctx.actor} ` +
        `(operation ${ctx.correlationId})`,
    );
    const event: ComposerAuditEvent = {
      id: randomUUID(),
      entityType,
      entityId,
      eventType,
      actor: ctx.actor,
      timestamp: new Date(),
      oldValue: options?.oldValue,
      newValue: options?.newValue,
      correlationId: ctx.correlationId,
      reason: options?.reason,
      entityVersion: options?.entityVersion,
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
    const audit = this.beginAudit(actor);
    if (!this.llmClient) {
      throw new NotImplementedError('AI product analysis is not enabled');
    }
    const trimmed = question.trim();
    if (!trimmed) {
      throw new InputError('question is required');
    }
    const answer = await this.llmClient.analyzeProduct(trimmed, productContext);
    await this.audit(audit, 'AI_ANALYST', String(productContext.entityRef ?? 'unknown'), 'PRODUCT_ANALYZED', {
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
    const audit = this.beginAudit(input.actor);
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
    await this.audit(audit, 'UPGRADE_NOTIFICATION', input.contractId, 'NOTIFICATIONS_DISPATCHED', {
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
    const audit = this.beginAudit(actor);
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
    await this.audit(audit, 'CONTRACT_SUBSCRIPTION', sub.id, 'SUBSCRIPTION_CREATED', {
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
    const audit = this.beginAudit(actor);
    if (!(SUBSCRIPTION_STATUSES as readonly string[]).includes(status)) {
      throw new InputError(`Invalid status "${status}". Expected: ${SUBSCRIPTION_STATUSES.join(', ')}`);
    }
    const existing = await this.repository.getSubscription(id);
    if (!existing) throw new InputError(`Subscription ${id} not found`);
    await this.repository.updateSubscriptionStatus(id, status as ContractSubscription['status']);
    await this.audit(audit, 'CONTRACT_SUBSCRIPTION', id, 'SUBSCRIPTION_STATUS_CHANGED', {
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

/**
 * The FS code for a requirement, derived from the requirement's own ref.
 *
 * `URS-WD-001` becomes `FS-WD-001`, so the two halves of a trace read as
 * obviously paired and a reviewer can say the pair out loud. No convention was
 * documented; this one is chosen because it carries the requirement's domain
 * and ordinal rather than inventing a second numbering that would have to be
 * cross-referenced.
 *
 * A ref that does not start with `URS-` is prefixed instead of rewritten — the
 * URS side generates set keys from a timestamp when no stable key is
 * configured, and mangling one of those would produce a code that traces to
 * nothing recognisable.
 */
export function functionalSpecCode(requirementRef: string): string {
  const trimmed = requirementRef.trim();
  return /^URS-/i.test(trimmed)
    ? `FS-${trimmed.slice(4)}`
    : `FS-${trimmed}`;
}
