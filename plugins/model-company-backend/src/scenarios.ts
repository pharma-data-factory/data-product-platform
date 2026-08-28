import type { ScenarioId } from './types';

export interface ScenarioDefinition {
  id: ScenarioId;
  name: string;
  description: string;
}

/** Legacy packaging plant scenarios (model-pharma.yaml). */
export const LEGACY_SCENARIO_DEFINITIONS: ScenarioDefinition[] = [
  {
    id: 'SCN-001',
    name: 'Normal Production',
    description: 'Steady RUNNING with nominal speed and low rejects via UNS.',
  },
  {
    id: 'SCN-002',
    name: 'Perfect Production',
    description: 'No downtime, zero rejects, ideal counters on UNS counts topics.',
  },
  {
    id: 'SCN-003',
    name: 'Microstop Storm',
    description: 'Frequent MICROSTOP state + events/* on packaging equipment.',
  },
  {
    id: 'SCN-004',
    name: 'Equipment Breakdown',
    description: 'BREAKDOWN on BOTTLE-FILLER-01 with retained state + event.',
  },
  {
    id: 'SCN-005',
    name: 'Material Starvation',
    description: 'MATERIAL_STARVED states and blocked orders via UNS.',
  },
  {
    id: 'SCN-006',
    name: 'Quality Reject Spike',
    description: 'Elevated reject counts on inspection/checkweigher.',
  },
  {
    id: 'SCN-007',
    name: 'Temperature Excursion',
    description: 'Temperature beyond limits on coater/dispenser UNS topics.',
  },
  {
    id: 'SCN-008',
    name: 'Warehouse Delay',
    description: 'HU staging delayed on warehouse UNS topics.',
  },
  {
    id: 'SCN-009',
    name: 'Changeover',
    description: 'STOPPED → CHANGEOVER → SETUP → RUNNING with order swap.',
  },
  {
    id: 'SCN-010',
    name: 'Network Interruption',
    description: 'Missed publishes + DEGRADED availability / STALE quality.',
  },
];

/** Autoinjector E2E scenarios (autoinjector-pharma.yaml). */
export const AUTOINJECTOR_SCENARIO_DEFINITIONS: ScenarioDefinition[] = [
  {
    id: 'SCN-AI-001',
    name: 'Autoinjector End-to-End Production',
    description: 'Drug Product → Assembly → Packaging → Finished Goods (nominal).',
  },
  {
    id: 'SCN-AI-002',
    name: 'Drug Product Quality Hold',
    description: 'DP batch stays on QUALITY_HOLD and blocks assembly.',
  },
  {
    id: 'SCN-AI-003',
    name: 'Filling Reject Spike',
    description: 'Elevated rejects on SYRINGE-FILLER-01.',
  },
  {
    id: 'SCN-AI-004',
    name: 'Device Assembly Breakdown',
    description: 'DEVICE-ASSEMBLER-01 BREAKDOWN.',
  },
  {
    id: 'SCN-AI-005',
    name: 'Functional Test Failure Spike',
    description: 'Excessive FUNCTIONAL-TESTER-01 failures.',
  },
  {
    id: 'SCN-AI-006',
    name: 'Packaging Material Missing',
    description: 'Cartons not staged — packaging blocked.',
  },
  {
    id: 'SCN-AI-007',
    name: 'Checkweigher Microstop Storm',
    description: 'Repeated PRODUCT_JAM microstops on CHECKWEIGHER-01.',
  },
  {
    id: 'SCN-AI-008',
    name: 'Serialization Outage',
    description: 'Serialization unavailable — packaging blocked.',
  },
  {
    id: 'SCN-AI-009',
    name: 'Warehouse Delay',
    description: 'FG HU receipt delayed / QUALITY_HOLD.',
  },
  {
    id: 'SCN-AI-010',
    name: 'Complete Nominal Batch',
    description: 'Deterministic perfect end-to-end reference run.',
  },
];

export const SCENARIO_DEFINITIONS: ScenarioDefinition[] = [
  ...AUTOINJECTOR_SCENARIO_DEFINITIONS,
  ...LEGACY_SCENARIO_DEFINITIONS,
];

export function scenarioById(id: ScenarioId): ScenarioDefinition {
  const found = SCENARIO_DEFINITIONS.find(s => s.id === id);
  if (!found) {
    throw new Error(`Unknown scenario ${id}`);
  }
  return found;
}

export function isAutoinjectorScenario(id: ScenarioId): boolean {
  return id.startsWith('SCN-AI-');
}
