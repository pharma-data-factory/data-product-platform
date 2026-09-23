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
  ProductBaseline,
  ProductRequirement,
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
  deleteTraceabilityLink(id: string): Promise<void>;
  listTraceabilityLinks(): Promise<TraceabilityLink[]>;

  createProductBaseline(baseline: ProductBaseline): Promise<ProductBaseline>;
  getProductBaseline(id: string): Promise<ProductBaseline | null>;
  listProductBaselines(productVersionId: string): Promise<ProductBaseline[]>;
  updateProductBaseline(baseline: ProductBaseline): Promise<void>;

  createAuditEvent(event: ComposerAuditEvent): Promise<void>;
  getEntityAuditTrail(entityType: string, entityId: string): Promise<ComposerAuditEvent[]>;
}
