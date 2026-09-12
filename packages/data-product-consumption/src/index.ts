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
export {
  DataProductConsumptionClient,
  dataProductConsumptionApiRef,
} from './client';
export type { DataProductConsumptionApi } from './client';
export {
  useDataProduct,
  useDataProductContract,
  useDataProductLineage,
  useDataProductQuality,
  useDataProductQuery,
  useDataProductStream,
} from './hooks';
export { DataProductTable } from './renderers/DataProductTable';
export { DataProductMetricCards } from './renderers/DataProductMetricCards';
export {
  DataProductJsonViewer,
  DataProductSchemaViewer,
} from './renderers/DataProductJsonViewer';
export {
  DataProductRealtimeFeed,
  DataProductTimeseries,
} from './renderers/DataProductRealtimeFeed';
export {
  getDataProductExtension,
  listDataProductExtensions,
  registerDataProductExtension,
} from './extensions/registry';
export type { DataProductExtension, ExtensionProps } from './extensions/registry';
