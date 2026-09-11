/**
 * Product Composer API request/response types.
 *
 * Domain types (Product, ProductVersion, ProductComponent, DataContract,
 * TraceabilityLink) are owned by @internal/platform-common and re-exported
 * here for convenience.
 */

export type {
  Product,
  ProductVersion,
  ProductComponent,
  DataContract,
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
  schemaType: string;
  schemaRef?: string;
  contractSpec?: Record<string, unknown>;
  version?: string;
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
