/**
 * Node/backend-safe entry — no React renderers.
 * Backend plugins must import from '@internal/data-product-consumption/node'.
 */
export type {
  ConsumeContext,
  ConsumptionErrorCode,
  DataProductContracts,
  DataProductDescriptor,
  DataProductInterface,
  DataProductLineageEdge,
  DataProductPresentation,
  DataProductPublishMeta,
  DataProductPublishPort,
  DataProductQualityMeta,
  DataProductValidationMeta,
  InterfaceDirection,
  InterfaceType,
  PresentationCapability,
  PublishPortType,
  QueryResult,
  StreamEvent,
  StreamProtocol,
  ValidationStatusView,
} from './types';
export { ConsumptionError } from './types';
export { descriptorFromEntity, isDataProductComponent } from './descriptor';
export { buildProductPublishTopic } from './publishTopic';
export type { ProductPublishTopicParts } from './publishTopic';
export { buildWarehouseDataset } from './warehouseDataset';
export type { WarehouseDatasetParts } from './warehouseDataset';
