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
  DataProductQualityMeta,
  DataProductValidationMeta,
  InterfaceType,
  PresentationCapability,
  QueryResult,
  StreamEvent,
  StreamProtocol,
  ValidationStatusView,
} from './types';
export { ConsumptionError } from './types';
export { descriptorFromEntity, isDataProductComponent } from './descriptor';
