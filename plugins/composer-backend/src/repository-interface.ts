import {
  Product,
  ProductVersion,
  ProductComponent,
  DataContract,
  TraceabilityLink,
} from './types';

export interface ComposerAuditEvent {
  id: string;
  entityType: string;
  entityId: string;
  eventType: string;
  actor: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
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

  createProductComponent(component: ProductComponent): Promise<ProductComponent>;
  listProductComponents(versionId: string): Promise<ProductComponent[]>;

  createDataContract(contract: DataContract): Promise<DataContract>;
  listDataContracts(componentId: string): Promise<DataContract[]>;

  createTraceabilityLink(link: TraceabilityLink): Promise<TraceabilityLink>;
  deleteTraceabilityLink(id: string): Promise<void>;
  listTraceabilityLinks(): Promise<TraceabilityLink[]>;

  createAuditEvent(event: ComposerAuditEvent): Promise<void>;
}
