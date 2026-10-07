import type { ContractCoordinate } from '@internal/platform-common';
import {
  Product,
  ProductVersion,
  ProductComponent,
  DataContract,
  ProductDependency,
  ContractSubscription,
  UpgradeNotification,
  TraceabilityLink,
  TestExecution,
  ProductBaseline,
  ProductRequirement,
  AISpecDraft,
  AISpecDraftStatus,
  FunctionalSpecification,
  ProductSignature,
} from './types';

export interface ComposerAuditEvent {
  id: string;
  entityType: string;
  entityId: string;
  eventType: string;
  actor: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  oldValue?: string;
  newValue?: string;
  /**
   * The operation this event belongs to. **Required, and that is the point.**
   *
   * The URS side learned this the expensive way (NXD-065): a nullable column
   * plus an optional field meant 35 write sites and not one of them set it.
   * Here the column did not even exist — `ComposerService.audit()` minted a
   * fresh `randomUUID()` per event, so approving a baseline wrote events for
   * the baseline, the version and each requirement it pins with nothing
   * joining them.
   *
   * Required means a new write site cannot compile without one, and
   * `ComposerService.writeAudit` supplies it from the `AuditContext` opened at
   * the service entry point. Callers cannot state one: `writeAudit` takes
   * `Omit<ComposerAuditEvent, 'correlationId'>`, so wanting a different
   * correlation means opening a different context — a deliberate act rather
   * than a slip.
   */
  correlationId: string;
  /**
   * Why the change was made. Optional because most events are mechanical
   * consequences of one another; the ones a reviewer asks "why" about are the
   * ones a human initiated. Closes half of NXD-064 C-2.
   */
  reason?: string;
  /**
   * The entity's revision at the time of the event, where the entity carries
   * one. Lets this trail be joined to the URS trail by version rather than
   * only by timestamp. The other half of NXD-064 C-2.
   */
  entityVersion?: number;
}

export interface IComposerRepository {
  createProduct(product: Product): Promise<Product>;
  getProduct(id: string): Promise<Product | null>;
  /** The product that claims a Catalog entity, case-folded. Step 2. */
  getProductByCatalogEntityRef(entityRef: string): Promise<Product | null>;
  listProducts(
    limit: number,
    offset: number,
  ): Promise<{ items: Product[]; total: number }>;
  updateProduct(product: Product): Promise<void>;

  createProductVersion(version: ProductVersion): Promise<ProductVersion>;
  getProductVersion(id: string): Promise<ProductVersion | null>;
  listProductVersions(productId: string): Promise<ProductVersion[]>;
  /** Versions bound to a URS baseline, across products (NXD-119). */
  listProductVersionsForUrsBaseline(
    ursBaselineId: string,
  ): Promise<ProductVersion[]>;
  updateProductVersion(version: ProductVersion): Promise<void>;
  /** NXD-137. Write-once; true when the version now carries this ref. */
  setProductVersionArtifactRef(id: string, artifactRef: string): Promise<boolean>;
  /** NXD-139. Versions registered as any version of `namespace/name`. */
  listProductVersionsForArtifact(
    namespace: string,
    name: string,
  ): Promise<ProductVersion[]>;

  createProductComponent(component: ProductComponent): Promise<ProductComponent>;
  getProductComponent(id: string): Promise<ProductComponent | undefined>;
  listProductComponents(versionId: string): Promise<ProductComponent[]>;

  createDataContract(contract: DataContract): Promise<DataContract>;
  getDataContract(id: string): Promise<DataContract | undefined>;
  listDataContracts(componentId: string): Promise<DataContract[]>;
  findDataContractByCoordinate(coordinate: ContractCoordinate): Promise<DataContract | undefined>;

  createProductDependency(dep: ProductDependency): Promise<ProductDependency>;
  getProductDependency(id: string): Promise<ProductDependency | undefined>;
  findProductDependency(versionId: string, contractId: string): Promise<ProductDependency | undefined>;
  listProductDependencies(versionId: string): Promise<ProductDependency[]>;
  deleteProductDependency(id: string): Promise<void>;
  listDependenciesByContractId(contractId: string): Promise<ProductDependency[]>;

  // Schema Snapshots (A-2)
  createSchemaSnapshot(snapshot: { id: string; contractId: string; version: string; schema: object; capturedAt: string; capturedBy: string }): Promise<void>;
  listSchemaSnapshots(contractId: string): Promise<Array<{ id: string; contractId: string; version: string; schema: object; capturedAt: string; capturedBy: string }>>;

  // Upgrade Notifications (W2-1)
  createUpgradeNotification(n: UpgradeNotification): Promise<UpgradeNotification>;
  listUpgradeNotifications(consumerRef: string, unreadOnly?: boolean): Promise<UpgradeNotification[]>;
  markNotificationRead(id: string): Promise<void>;

  // Contract Subscriptions (P-EXT-S4)
  createSubscription(sub: ContractSubscription): Promise<ContractSubscription>;
  getSubscription(id: string): Promise<ContractSubscription | undefined>;
  findSubscription(contractId: string, consumerRef: string): Promise<ContractSubscription | undefined>;
  listSubscriptionsByContract(contractId: string): Promise<ContractSubscription[]>;
  listSubscriptionsByConsumer(consumerRef: string): Promise<ContractSubscription[]>;
  updateSubscriptionStatus(id: string, status: ContractSubscription['status']): Promise<void>;

  /**
   * Write the requirement snapshot and the version's URS binding together.
   *
   * One method rather than two because the two halves are meaningless apart:
   * a binding with no requirements looks like an empty baseline, and
   * requirements with no binding are unreachable. Implementations must apply
   * both or neither.
   */
  bindUrsBaseline(
    productVersionId: string,
    ursBaselineId: string,
    requirements: ProductRequirement[],
  ): Promise<void>;
  listProductRequirements(productVersionId: string): Promise<ProductRequirement[]>;

  createTraceabilityLink(link: TraceabilityLink): Promise<TraceabilityLink>;
  /**
   * Resolve one link by id. Added so `deleteTraceabilityLink` can refuse an id
   * that does not exist instead of reporting success for it — `listTraceability
   * Links()` was an unbounded full-table read then and is not a substitute.
   * NXD-072.
   */
  getTraceabilityLink(id: string): Promise<TraceabilityLink | null>;
  deleteTraceabilityLink(id: string): Promise<void>;
  /**
   * Every link whose source **or** target is one of `entityIds`. NXD-093.
   *
   * There is deliberately no unscoped variant. The previous signature read
   * the whole table and six service paths filtered it in memory, including
   * the release gate and the evidence package. Callers pass the ids their own
   * filters key on and keep those filters, so the result is a bounded
   * superset of what they used before, not a reinterpretation of it.
   */
  listTraceabilityLinks(
    entityIds: readonly string[],
  ): Promise<TraceabilityLink[]>;

  createTestExecution(execution: TestExecution): Promise<TestExecution>;
  getTestExecution(id: string): Promise<TestExecution | null>;
  /**
   * Every recorded run for the given requirement versions, oldest first.
   *
   * Takes a list rather than one id because coverage asks for a whole
   * product version's requirements at once, and one query beats N.
   */
  listTestExecutions(requirementVersionIds: string[]): Promise<TestExecution[]>;
  /**
   * Whether any product version's snapshot holds this requirement, by either
   * key — the version UUID or the stable ref. Coverage joins on both, so an
   * existence check that accepted only one would refuse links the read path
   * would happily have counted.
   */
  requirementReferenceExists(reference: string): Promise<boolean>;

  createProductBaseline(baseline: ProductBaseline): Promise<ProductBaseline>;
  getProductBaseline(id: string): Promise<ProductBaseline | null>;
  listProductBaselines(productVersionId: string): Promise<ProductBaseline[]>;
  /** NXD-128: approvals and releases as attested. Append-only. */
  addProductSignature(signature: ProductSignature): Promise<void>;
  listProductSignatures(productId: string): Promise<ProductSignature[]>;
  updateProductBaseline(baseline: ProductBaseline): Promise<void>;

  // Functional Specifications — Stage 3 (MVP1 item 11)
  createFunctionalSpecification(spec: FunctionalSpecification): Promise<void>;
  getFunctionalSpecification(id: string): Promise<FunctionalSpecification | null>;
  listFunctionalSpecifications(
    productVersionId: string,
  ): Promise<FunctionalSpecification[]>;

  // AI Spec Drafts (MVP1 item 6 / NXD-064 C-3)
  createSpecDraft(draft: AISpecDraft): Promise<void>;
  getSpecDraft(id: string): Promise<AISpecDraft | null>;
  listSpecDraftsForBaseline(ursBaselineId: string): Promise<AISpecDraft[]>;
  /**
   * Records the outcome of a review. Only the fields a decision can change:
   * the proposal itself is immutable once written, because a draft that can be
   * edited after the fact is not evidence of what the model proposed.
   */
  updateSpecDraftOutcome(outcome: {
    id: string;
    status: AISpecDraftStatus;
    appliedBy?: string;
    appliedAt?: string;
    productId?: string;
  }): Promise<void>;

  createAuditEvent(event: ComposerAuditEvent): Promise<void>;
  getEntityAuditTrail(entityType: string, entityId: string): Promise<ComposerAuditEvent[]>;
}
