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
  relationshipType: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}
