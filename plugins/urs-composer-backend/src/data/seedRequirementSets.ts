/**
 * Weighing & Dispensing (W&D) Requirement Set seed data.
 *
 * Uses a stable requirement set key (URS-WD) so requirement IDs stay
 * URS-WD-001…URS-WD-010 in every environment. Validation documents reference
 * these IDs, so they must not drift with a generated timestamp key.
 *
 * `priority` is derived from criticality (CRITICAL/HIGH → MUST, MEDIUM →
 * SHOULD); the source URS table classifies criticality but not MoSCoW
 * priority, which the domain model requires.
 */

import type { RequirementClassification } from '@internal/platform-common';
import { GxPRelevance, RequirementPriority, SolutionType } from '../types';

export interface SeedRequirement {
  requirementId: string;
  title: string;
  statement: string;
  priority: RequirementPriority;
  classification: RequirementClassification;
  gxpRelevance: GxPRelevance;
}

export interface SeedRequirementSet {
  requirementSetId: string;
  businessCapabilityRefs: string[];
  businessNeed: string;
  stakeholders: string[];
  solutionType: SolutionType;
  solutionName: string;
  gxpRelevance: GxPRelevance;
  patientImpact: boolean;
  dataIntegrityImpact: boolean;
  electronicRecords: boolean;
  requirements: SeedRequirement[];
}

export const WD_REQUIREMENT_SET: SeedRequirementSet = {
  requirementSetId: 'URS-WD',
  businessCapabilityRefs: ['business-capability:make/material-dispensing'],
  businessNeed:
    'Dispensing operators must weigh and dispense the correct raw material in the correct quantity for each production order, with a complete attributable record available for batch release.',
  stakeholders: ['role:weighing-operator', 'role:dispensing-operator'],
  solutionType: SolutionType.COMPONENT,
  solutionName: 'Weighing & Dispensing',
  gxpRelevance: GxPRelevance.DIRECT,
  patientImpact: true,
  dataIntegrityImpact: true,
  electronicRecords: true,
  requirements: [
    {
      requirementId: 'URS-WD-001',
      title: 'Weighing event ingestion',
      statement:
        'The solution shall ingest weighing events (gross weight, tare, timestamp, scale id) from the connected balance in near real time.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'INPUT_PORT',
        requirementNature: 'FUNCTIONAL',
        criticality: 'HIGH',
      },
      gxpRelevance: GxPRelevance.DIRECT,
    },
    {
      requirementId: 'URS-WD-002',
      title: 'Material identification',
      statement:
        'The solution shall associate each weighing event with the raw material identity (material code, lot number, supplier).',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'INPUT_PORT',
        requirementNature: 'FUNCTIONAL',
        criticality: 'HIGH',
      },
      gxpRelevance: GxPRelevance.DIRECT,
    },
    {
      requirementId: 'URS-WD-003',
      title: 'Target weight validation',
      statement:
        'The solution shall validate each dispensed weight against the prescribed target range and reject out-of-tolerance weights.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'PROCESSING',
        requirementNature: 'FUNCTIONAL',
        criticality: 'CRITICAL',
      },
      gxpRelevance: GxPRelevance.DIRECT,
    },
    {
      requirementId: 'URS-WD-004',
      title: 'Dispense sequence enforcement',
      statement:
        'The solution shall enforce the dispensing sequence for a production order and prevent out-of-order or duplicate dispensing.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'PROCESSING',
        requirementNature: 'FUNCTIONAL',
        criticality: 'HIGH',
      },
      gxpRelevance: GxPRelevance.DIRECT,
    },
    {
      requirementId: 'URS-WD-005',
      title: 'Immutable audit trail',
      statement:
        'The solution shall record an immutable, attributable audit trail of every weighing (who, what, when, scale, value) in line with ALCOA+ and 21 CFR Part 11.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'GOVERNANCE',
        requirementNature: 'COMPLIANCE',
        criticality: 'CRITICAL',
      },
      gxpRelevance: GxPRelevance.DIRECT,
    },
    {
      requirementId: 'URS-WD-006',
      title: 'Batch traceability',
      statement:
        'The solution shall link each weighing to its production order and batch so the complete dispensing history of a batch is traceable.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'DATA_STORAGE',
        requirementNature: 'COMPLIANCE',
        criticality: 'HIGH',
      },
      gxpRelevance: GxPRelevance.DIRECT,
    },
    {
      requirementId: 'URS-WD-007',
      title: 'Dispensing status output',
      statement:
        'The solution shall expose the current dispensing status (material, target, dispensed, remaining) via a REST API.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'OUTPUT_PORT',
        requirementNature: 'FUNCTIONAL',
        criticality: 'HIGH',
        interfaceType: 'REST',
      },
      gxpRelevance: GxPRelevance.DIRECT,
    },
    {
      requirementId: 'URS-WD-008',
      title: 'Electronic signature',
      statement:
        'The solution shall require an electronic signature to confirm each dispensing step and to approve any correction.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'GOVERNANCE',
        requirementNature: 'COMPLIANCE',
        criticality: 'CRITICAL',
      },
      gxpRelevance: GxPRelevance.DIRECT,
    },
    {
      requirementId: 'URS-WD-009',
      title: 'Device health observability',
      statement:
        'The solution shall expose health and connectivity status of the connected balance for operations monitoring.',
      priority: RequirementPriority.SHOULD,
      classification: {
        componentType: 'OBSERVABILITY',
        requirementNature: 'OPERABILITY',
        criticality: 'MEDIUM',
      },
      gxpRelevance: GxPRelevance.DIRECT,
    },
    {
      requirementId: 'URS-WD-010',
      title: 'Status availability SLO',
      statement:
        'The solution shall make the latest dispensing status available within 5 seconds of the weighing event.',
      priority: RequirementPriority.SHOULD,
      classification: {
        componentType: 'OBSERVABILITY',
        requirementNature: 'AVAILABILITY',
        criticality: 'MEDIUM',
      },
      gxpRelevance: GxPRelevance.DIRECT,
    },
  ],
};

export const SEED_REQUIREMENT_SETS: SeedRequirementSet[] = [WD_REQUIREMENT_SET];
