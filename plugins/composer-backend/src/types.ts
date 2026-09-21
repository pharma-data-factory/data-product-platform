/**
 * Product Composer API request/response types.
 *
 * Domain types (Product, ProductVersion, ProductComponent, DataContract,
 * TraceabilityLink) are owned by @internal/platform-common and re-exported
 * here for convenience.
 */

import type { ComponentType, QualityRule } from '@internal/platform-common';

export type {
  Product,
  ProductVersion,
  ProductComponent,
  DataContract,
  ProductDependency,
  TraceabilityLink,
  ProductBaseline,
} from '@internal/platform-common';

export interface CreateProductRequest {
  name: string;
  description?: string;
  businessPurpose?: string;
  productType: string;
  domain?: string;
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
  /** Required. Human-readable name, unique (case-insensitive) per component. */
  name: string;
  /** Optional. Who owns this contract (e.g. a group entity ref). */
  owner?: string;
  schemaType: string;
  schemaRef?: string;
  contractSpec?: Record<string, unknown>;
  version?: string;
  /** Declarative quality rules for this contract. Phase 4 (P4-S6). */
  qualityRules?: QualityRule[];
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
