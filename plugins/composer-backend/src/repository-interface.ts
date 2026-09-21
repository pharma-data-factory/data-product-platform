import {
  Product,
  ProductVersion,
  ProductComponent,
  DataContract,
  TraceabilityLink,
  ProductBaseline,
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
  getDataContract(id: string): Promise<DataContract | undefined>;
  listDataContracts(componentId: string): Promise<DataContract[]>;
  findDataContractByName(componentId: string, name: string): Promise<DataContract | undefined>;

  createTraceabilityLink(link: TraceabilityLink): Promise<TraceabilityLink>;
  deleteTraceabilityLink(id: string): Promise<void>;
  listTraceabilityLinks(): Promise<TraceabilityLink[]>;

  createProductBaseline(baseline: ProductBaseline): Promise<ProductBaseline>;
  getProductBaseline(id: string): Promise<ProductBaseline | null>;
  listProductBaselines(productVersionId: string): Promise<ProductBaseline[]>;
  updateProductBaseline(baseline: ProductBaseline): Promise<void>;

  createAuditEvent(event: ComposerAuditEvent): Promise<void>;
  getEntityAuditTrail(entityType: string, entityId: string): Promise<ComposerAuditEvent[]>;
}
