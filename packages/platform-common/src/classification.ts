/**
 * URS requirement classification model shared by the URS Composer and the
 * Product Composer. Stable enum vocabularies for the multi-dimensional
 * classification of user requirements.
 */

export const COMPONENT_TYPES = [
  'INPUT_PORT',
  'PROCESSING',
  'DATA_STORAGE',
  'OUTPUT_PORT',
  'DISCOVERY_PORT',
  'DATA_CONTRACT',
  'GOVERNANCE',
  'DOCUMENTATION',
  'QUALITY_TESTING',
  'OBSERVABILITY',
  'CICD_DEPLOYMENT',
  'CROSS_CUTTING',
] as const;

export type ComponentType = (typeof COMPONENT_TYPES)[number];

export const REQUIREMENT_NATURES = [
  'FUNCTIONAL',
  'NON_FUNCTIONAL',
  'SECURITY',
  'COMPLIANCE',
  'DATA_QUALITY',
  'PERFORMANCE',
  'AVAILABILITY',
  'USABILITY',
  'MAINTAINABILITY',
  'OPERABILITY',
] as const;

export type RequirementNature = (typeof REQUIREMENT_NATURES)[number];

export const CRITICALITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export type Criticality = (typeof CRITICALITIES)[number];

export const DATA_CLASSIFICATIONS = [
  'PUBLIC',
  'INTERNAL',
  'CONFIDENTIAL',
  'RESTRICTED',
] as const;

export type DataClassification = (typeof DATA_CLASSIFICATIONS)[number];

export const INTERFACE_TYPES = [
  'REST',
  'EVENT',
  'MQTT',
  'KAFKA',
  'DB',
  'FILE',
] as const;

export type InterfaceType = (typeof INTERFACE_TYPES)[number];

export const VALIDATION_LEVELS = ['IQ', 'OQ', 'UAT', 'NONE'] as const;

export type ValidationLevel = (typeof VALIDATION_LEVELS)[number];

export const AUTOMATION_READINESS_LEVELS = ['FULLY', 'PARTIALLY', 'NOT'] as const;

export type AutomationReadiness = (typeof AUTOMATION_READINESS_LEVELS)[number];

/**
 * Multi-dimensional classification of a single requirement. `componentType` is
 * the primary mapping to a Blackbox component; `secondaryTypes` allows
 * additional (cross-cutting) mappings without weakening the primary type.
 */
export interface RequirementClassification {
  componentType: ComponentType;
  secondaryTypes?: ComponentType[];
  requirementNature: RequirementNature;
  criticality: Criticality;
  interfaceType?: InterfaceType;
  dataClassification?: DataClassification;
  validationLevel?: ValidationLevel;
  sourceSystem?: string;
  targetSystem?: string;
  automationReadiness?: AutomationReadiness;
}

function inList<T extends string>(list: readonly T[], value: string): value is T {
  return (list as readonly string[]).includes(value);
}

export function isComponentType(value: string): value is ComponentType {
  return inList(COMPONENT_TYPES, value);
}

export function isRequirementNature(value: string): value is RequirementNature {
  return inList(REQUIREMENT_NATURES, value);
}

export function isCriticality(value: string): value is Criticality {
  return inList(CRITICALITIES, value);
}

export function isDataClassification(value: string): value is DataClassification {
  return inList(DATA_CLASSIFICATIONS, value);
}

export function isInterfaceType(value: string): value is InterfaceType {
  return inList(INTERFACE_TYPES, value);
}

export function isValidationLevel(value: string): value is ValidationLevel {
  return inList(VALIDATION_LEVELS, value);
}

export function isAutomationReadiness(value: string): value is AutomationReadiness {
  return inList(AUTOMATION_READINESS_LEVELS, value);
}
