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
  ProductManifest,
  PersistedProductManifest,
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
  /** Exactly one APPROVED URS baseline id (required). */
  ursBaselineId: string;
  /**
   * @deprecated Use ursBaselineId. Accepted only when ursBaselineId is absent
   * and the array contains exactly one entry (migration compat).
   */
  ursBaselineIds?: string[];
}

/** Server-built Scaffolder pin values from an approved Product Manifest. */
export interface ProductScaffoldBinding {
  productId: string;
  productName: string;
  productSlug: string;
  description?: string;
  domain?: string;
  owner?: string;
  productVersionId: string;
  productVersion: string;
  productBaselineId: string;
  ursBaselineId: string;
  manifestContentHash: string;
  manifestVersion: string;
  /** Merge into scaffolderApi.scaffold({ values }). */
  scaffolderPinValues: {
    productManifestContentHash: string;
    ursBaselineId: string;
    productBaselineId: string;
    productVersionId: string;
    productId: string;
  };
  /** Official Golden Path template entity names that accept these pins. */
  supportedTemplateRefs: string[];
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

/** Advisory Composer reverse index for URS Change Requests (not GxP). */
export type ProductChangeSignalMatchAxis =
  | 'PRODUCT_VERSION'
  | 'PRODUCT'
  | 'URS_BASELINE';

export interface ProductChangeSignal {
  id: string;
  productId?: string;
  productVersionId: string;
  ursBaselineId?: string;
  changeRequestId: string;
  source: 'SOFT_HYDRATE';
  matchAxis: ProductChangeSignalMatchAxis;
  createdBy: string;
  createdAt: Date;
  lastHydratedAt: Date;
}

export interface ProductChangeSignalView extends ProductChangeSignal {
  title?: string;
  status?: string;
}

export interface ProductChangeSignalsResult {
  items: ProductChangeSignalView[];
  scanned: number;
  ursTotal: number;
  hydratedCount: number;
  disclaimer: 'advisory-soft-index-not-gxp';
}
