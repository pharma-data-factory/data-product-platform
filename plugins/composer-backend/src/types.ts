/**
 * Product Composer API request/response types.
 *
 * Domain types (Product, ProductVersion, ProductComponent, DataContract,
 * TraceabilityLink) are owned by @internal/platform-common and re-exported
 * here for convenience.
 */

// UpgradeNotification is not imported here — it is re-exported directly from
// platform-common below, so an import binding would go unused.
import type {
  ComponentType,
  ContractExchange,
  QualityRule,
} from '@internal/platform-common';

export type {
  Product,
  ProductVersion,
  ProductComponent,
  DataContract,
  ProductDependency,
  ContractSubscription,
  UpgradeNotification,
  TraceabilityLink,
  ProductBaseline,
  ProductRequirement,
  ProductRequirementCoverage,
  ProductRequirementCoverageRow,
  RequirementOrigin,
} from '@internal/platform-common';

/** Body of `POST /versions/:versionId/urs-baseline`. */
export interface BindUrsBaselineRequest {
  ursBaselineId?: string;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  businessPurpose?: string;
  productType: string;
  domain?: string;
  /** Policy Pack coordinates: namespace/name@version. Validated at release gate (5-R1). */
  declaredPolicies?: string[];
  subdomain?: string;
  owner?: string;
  team?: string;
  lifecycle?: string;
  criticality?: string;
  gxpRelevance?: string;
  dataClassification?: string;
  consumers?: string[];
  slo?: Record<string, unknown>;
  costInfo?: Record<string, unknown>;
  /**
   * Step 2 ("one door"): the repository the product's code lives in and the
   * Catalog entity that describes it, both written by the
   * `nexora:product:create` scaffolder action. Optional — the other creation
   * paths have neither.
   */
  repositoryUrl?: string;
  catalogEntityRef?: string;
}

export interface CreateProductVersionRequest {
  version?: string;
  changelog?: string;
}

export interface CreateProductComponentRequest {
  componentType: string;
  name: string;
  description?: string;
  ref?: string;
  interfaceType?: string;
  sourceSystem?: string;
  targetSystem?: string;
  config?: Record<string, unknown>;
}

export interface CreateDataContractRequest {
  /**
   * Required. Owning namespace — the first segment of the coordinate.
   * Lowercase kebab-case, e.g. `sales`.
   */
  namespace: string;
  /**
   * Required. Contract name — the second segment of the coordinate.
   * Lowercase kebab-case. Unique per `(namespace, name, version)`, not per
   * component.
   */
  name: string;
  /** Optional. Who owns this contract (e.g. a group entity ref). */
  owner?: string;
  schemaType: string;
  schemaRef?: string;
  contractSpec?: Record<string, unknown>;
  version?: string;
  /** Declarative quality rules for this contract. Phase 4 (P4-S6). */
  qualityRules?: QualityRule[];
  /**
   * How consumers obtain the data — delivery mechanism, endpoint, access mode,
   * classification and SLA. Phase 4 closure (Slice 2).
   */
  exchange?: ContractExchange;
}

// ── Data Lineage (Phase 4, P4-S4) ─────────────────────────────────────────

/**
 * One hop upstream: a contract this version consumes, with its producing
 * context. The producing product may be unknown if the contract no longer
 * has a reachable component (orphaned contract).
 */
export interface LineageUpstreamEntry {
  dependencyId: string;
  contractId: string;
  contractName: string;
  producerComponentId: string;
  producerVersionId: string;
  producerProductId: string;
  producerProductName: string;
}

/**
 * One hop downstream: a contract this version produces, and who consumes it.
 */
export interface LineageDownstreamEntry {
  contractId: string;
  contractName: string;
  consumerVersionId: string;
  consumerProductId: string;
  consumerProductName: string;
}

/**
 * The data lineage view for one product version.
 *
 * Upstream = what this version consumes (via ProductDependency).
 * Downstream = who depends on this version's contracts.
 *
 * This is a one-hop view — multi-hop traversal is Phase 6 (Lineage UI).
 */
export interface DataLineage {
  versionId: string;
  upstream: LineageUpstreamEntry[];
  downstream: LineageDownstreamEntry[];
}

// ── Contract Subscription (P-EXT-S4) ──────────────────────────────────────

export interface CreateSubscriptionRequest {
  contractId: string;
  consumerRef: string;
  consumerLabel: string;
  compatibleVersions?: string;
  purpose?: string;
}

export interface CreateProductDependencyRequest {
  /** ID of the DataContract this version depends on. */
  contractId: string;
  /** Optional human note about why this dependency exists. */
  description?: string;
}

export interface CreateTraceabilityLinkRequest {
  sourceType: string;
  sourceId: string;
  sourceRevision?: number;
  relationshipType: string;
  targetType: string;
  targetId: string;
  targetRevision?: number;
  metadata?: Record<string, unknown>;
}

export interface TransitionProductVersionRequest {
  targetStatus: string;
  releaseCommitSha?: string;
  artifactDigest?: string;
}

export interface CreateProductBaselineRequest {
  baselineVersion?: string;
  ursBaselineIds?: string[];
}

// ============================================================================
// AI Product Spec Generation
// ============================================================================

export type AISpecDraftStatus = 'PENDING_REVIEW' | 'APPLIED' | 'REJECTED';

export interface AISuggestedComponent {
  name: string;
  reason: string;
  /**
   * Platform component vocabulary (see COMPONENT_TYPES in platform-common).
   * The model picks one; the parser falls back to PROCESSING when it does not
   * return a value from the list.
   */
  componentType: ComponentType;
  priority: 'required' | 'recommended' | 'optional';
  traceabilityRefs: string[];
}

export interface AISuggestedContract {
  name: string;
  type: string;
  description: string;
  traceabilityRefs: string[];
}

export interface AISpecDraft {
  id: string;
  ursBaselineId: string;
  status: AISpecDraftStatus;
  productName: string;
  description: string;
  domain: string;
  suggestedComponents: AISuggestedComponent[];
  suggestedContracts: AISuggestedContract[];
  generatedBy: string;
  generatedAt: string;
  appliedBy?: string;
  appliedAt?: string;
}

export interface GenerateProductSpecRequest {
  ursBaselineId: string;
}
