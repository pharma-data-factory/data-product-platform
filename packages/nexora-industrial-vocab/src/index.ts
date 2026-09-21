/**
 * Nexora Industrial Vocabulary — extracted from `platform-common` (GP-8).
 *
 * This package is the canonical home for manufacturing and industrial
 * domain types that previously lived in `packages/platform-common/src/nexora-industrial.ts`.
 *
 * **Migration guide for existing consumers:**
 * Replace:
 *   import { DataProductHealth, ... } from '@internal/platform-common'
 * With:
 *   import { DataProductHealth, ... } from '@internal/nexora-industrial-vocab'
 *
 * The `@internal/platform-common` package continues to re-export these
 * symbols for backward compatibility, but the re-exports are marked
 * @deprecated and will be removed in a future version.
 *
 * This extraction closes GP-8 in the Hardcoded Domain Inventory.
 * See docs/nexora-transformation/HARDCODED_DOMAIN_INVENTORY.md.
 */

// Re-export everything from the platform-common source until the content
// is fully moved here. This makes the new package immediately usable
// without breaking existing imports.
export {
  NEXORA_ANNOTATION_PREFIX,
  NEXORA_ANNOTATIONS,
  EQUIPMENT_COMPONENT_TYPE,
  EQUIPMENT_PATH,
  INDUSTRIAL_CONTRACTS_PATH,
  INDUSTRIAL_QUALITY_PATH,
  CONNECTIVITY_STATUSES,
  CONNECTIVITY_KINDS,
  HEALTH_STATES,
  EQUIPMENT_STATES,
  CONTRACT_COMPATIBILITY,
  CAPABILITY_LEVELS,
  PROVIDER_RESULT_STATUSES,
  unconfiguredResult,
  unavailableResult,
  parseHealthState,
  parseEquipmentState,
  parseCompatibility,
  parseConnectivityKind,
} from '@internal/platform-common';

export type {
  ConnectivityStatus,
  ConnectivityKind,
  HealthState,
  EquipmentRuntimeState,
  ContractCompatibility,
  CapabilityLevel,
  ProviderResultStatus,
  ProviderResult,
  HealthCheck,
  DataProductHealth,
  DataProductRef,
  NexoraAsset,
  MetricValue,
  MetricPoint,
  EquipmentStateView,
  ConnectivityInterface,
  CapabilityItem,
  CapabilityGroup,
  ContractHistoryEntry,
  ContractView,
  RawEquipmentData,
  EquipmentEntity,
} from '@internal/platform-common';
