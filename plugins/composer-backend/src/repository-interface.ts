import {
  Product,
  ProductVersion,
  ProductComponent,
  DataContract,
  TraceabilityLink,
  ProductBaseline,
  PersistedProductManifest,
  ProductChangeSignal,
} from './types';
import type { ChangeImpactAssessment } from '@internal/platform-common';

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
}

export interface IComposerRepository {
  createProduct(product: Product): Promise<Product>;
  getProduct(id: string): Promise<Product | null>;
  listProducts(
    limit: number,
    offset: number,
  ): Promise<{ items: Product[]; total: number }>;
  updateProduct(product: Product): Promise<void>;

  createProductVersion(version: ProductVersion): Promise<ProductVersion>;
  getProductVersion(id: string): Promise<ProductVersion | null>;
  listProductVersions(productId: string): Promise<ProductVersion[]>;
  updateProductVersion(version: ProductVersion): Promise<void>;

  createProductComponent(component: ProductComponent): Promise<ProductComponent>;
  listProductComponents(versionId: string): Promise<ProductComponent[]>;

  createDataContract(contract: DataContract): Promise<DataContract>;
  listDataContracts(componentId: string): Promise<DataContract[]>;

  createTraceabilityLink(link: TraceabilityLink): Promise<TraceabilityLink>;
  deleteTraceabilityLink(id: string): Promise<void>;
  listTraceabilityLinks(): Promise<TraceabilityLink[]>;

  createProductBaseline(baseline: ProductBaseline): Promise<ProductBaseline>;
  getProductBaseline(id: string): Promise<ProductBaseline | null>;
  listProductBaselines(productVersionId: string): Promise<ProductBaseline[]>;
  updateProductBaseline(baseline: ProductBaseline): Promise<void>;

  createProductManifest(
    manifest: PersistedProductManifest,
  ): Promise<PersistedProductManifest>;
  getProductManifestByBaselineId(
    productBaselineId: string,
  ): Promise<PersistedProductManifest | null>;
  getProductManifestByVersionId(
    productVersionId: string,
  ): Promise<PersistedProductManifest | null>;

  upsertProductChangeSignal(
    signal: ProductChangeSignal,
  ): Promise<ProductChangeSignal>;
  listProductChangeSignals(
    productVersionId: string,
  ): Promise<ProductChangeSignal[]>;

  createChangeAssessment(
    assessment: ChangeImpactAssessment,
  ): Promise<ChangeImpactAssessment>;
  listChangeAssessments(
    productVersionId: string,
  ): Promise<ChangeImpactAssessment[]>;
  getOpenChangeAssessment(
    productVersionId: string,
  ): Promise<ChangeImpactAssessment | null>;

  createAuditEvent(event: ComposerAuditEvent): Promise<void>;
  getEntityAuditTrail(entityType: string, entityId: string): Promise<ComposerAuditEvent[]>;
}
