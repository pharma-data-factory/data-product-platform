/**
 * Example URS seed data — one complete requirement set per business capability.
 *
 * Each set is a full, editable URS example covering the wizard's content steps:
 * Business Need (businessNeed/desiredOutcome/businessValue/stakeholders),
 * URS Context (processContext/scope/outOfScope + regulatory flags),
 * Requirements (title/statement/rationale/priority/classification) and
 * Acceptance Criteria (serialized into `acceptanceIntent`).
 *
 * Sets are seeded as DRAFT so operators can revise them in the URS Composer.
 *
 * The W&D set uses a stable requirement set key (URS-WD) so requirement IDs
 * stay URS-WD-001…URS-WD-010 in every environment. Validation documents
 * reference these IDs, so they must not drift with a generated timestamp key.
 *
 * `priority` is derived from criticality (CRITICAL/HIGH → MUST, MEDIUM/LOW →
 * SHOULD); the source URS tables classify criticality but not MoSCoW priority,
 * which the domain model requires.
 */

import type { RequirementClassification } from '@internal/platform-common';
import {
  GxPRelevance,
  RequirementPriority,
  RequirementVersion,
  SolutionType,
  URSRequirement,
  URSStatus,
} from '../types';
import { firstVersion, versionOrdinal } from '../domain/versioning';
import { hashOf } from '../domain/signature-service';

/**
 * A single acceptance criterion for a seeded requirement. Mirrors the wizard's
 * `AcceptanceCriteriaDraft` shape; `tempId` is generated on read, so seed data
 * omits it. Serialized into `URSRequirement.acceptanceIntent` as JSON.
 */
export interface SeedAcceptanceCriterion {
  title: string;
  description?: string;
  verificationMethod?: string;
}

export interface SeedRequirement {
  requirementId: string;
  title: string;
  statement: string;
  rationale?: string;
  category?: string;
  priority: RequirementPriority;
  classification: RequirementClassification;
  gxpRelevance: GxPRelevance;
  acceptanceCriteria?: SeedAcceptanceCriterion[];
}

export interface SeedRequirementSet {
  requirementSetId: string;
  businessCapabilityRefs: string[];
  // BUSINESS NEED (wizard step 2)
  businessNeed: string;
  desiredOutcome?: string;
  businessValue?: string;
  stakeholders: string[];
  // URS CONTEXT (wizard step 3)
  processContext?: string;
  scope?: string;
  outOfScope?: string;
  // SOLUTION
  solutionType: SolutionType;
  solutionName: string;
  // REGULATORY
  gxpRelevance: GxPRelevance;
  patientImpact: boolean;
  dataIntegrityImpact: boolean;
  electronicRecords: boolean;
  requirements: SeedRequirement[];
}

/**
 * Serialize seeded acceptance criteria into the `acceptanceIntent` JSON string
 * the URS Composer UI reads back via `parseAcceptanceCriteria`. Returns
 * undefined when a requirement carries no criteria so the column stays null.
 */
export function acceptanceIntentFromSeed(
  criteria?: SeedAcceptanceCriterion[],
): string | undefined {
  if (!criteria || criteria.length === 0) {
    return undefined;
  }
  return JSON.stringify(criteria);
}

/**
 * Version 0.1 for a seeded requirement.
 *
 * Seeding writes to the store directly, so it never passes through
 * createRequirement and its seedInitialRequirementVersion. A requirement
 * without a version cannot be baselined, signed or revised, which left every
 * seeded set unbaselinable: Create Baseline failed with "Requirement
 * version(s) not found".
 *
 * Both seeders — the in-memory repository and the Postgres seed — build the
 * genesis version from here so the two cannot drift apart.
 *
 * The id is derived from the requirement rather than random, so re-seeding a
 * fresh install of the same version of this data yields the same ids.
 *
 * The version is DRAFT, never APPROVED: VERSION_TRANSITIONS reserves APPROVED
 * for versions carrying a valid QA signature (spec invariant 6), and a seeded
 * approval would be a signature nobody gave.
 */
export function genesisVersionOf(
  requirement: URSRequirement,
  now: Date,
): RequirementVersion {
  const first = firstVersion();
  const version: RequirementVersion = {
    id: `${requirement.id}-v${first.label}`,
    requirementId: requirement.requirementId,
    version: first.label,
    versionLabel: first.label,
    major: first.major,
    minor: first.minor,
    versionNumber: versionOrdinal(first),
    title: requirement.title,
    statement: requirement.statement,
    rationale: requirement.rationale,
    category: requirement.category,
    priority: requirement.priority,
    acceptanceIntent: requirement.acceptanceIntent,
    classification: requirement.classification,
    gxpRelevance: requirement.gxpRelevance,
    source: requirement.source,
    owner: requirement.owner,
    status: URSStatus.DRAFT,
    createdBy: 'system',
    createdAt: now,
    revision: 1,
  };
  version.contentHash = hashOf(version);
  return version;
}

export const WD_REQUIREMENT_SET: SeedRequirementSet = {
  requirementSetId: 'URS-WD',
  businessCapabilityRefs: ['business-capability:make/material-dispensing'],
  businessNeed:
    'Dispensing operators must weigh and dispense the correct raw material in the correct quantity for each production order, with a complete attributable record available for batch release.',
  desiredOutcome:
    'Every dispensing action is recorded attributable and traceable to a production order and batch, enabling first-time-right batch release.',
  businessValue:
    'Reduces dispensing errors and batch-release delays and replaces paper weighing logs with GxP-compliant electronic records.',
  stakeholders: ['role:weighing-operator', 'role:dispensing-operator'],
  processContext:
    'Raw material dispensing for production orders in the weighing and dispensing area, upstream of manufacturing execution.',
  scope:
    'Weighing event capture, material identification, target-weight validation, dispense sequence enforcement, audit trail, batch traceability, status output, electronic signature, and device health.',
  outOfScope:
    'Formulation and recipe management, ERP production-order creation, and physical scale calibration and maintenance.',
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
      rationale:
        'Near-real-time capture is the basis for every downstream dispensing record.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'INPUT_PORT',
        requirementNature: 'FUNCTIONAL',
        criticality: 'HIGH',
      },
      gxpRelevance: GxPRelevance.DIRECT,
      acceptanceCriteria: [
        {
          title: 'Balance events arrive within 2 seconds',
          description:
            'Gross weight, tare, timestamp, and scale id are ingested from the connected balance.',
          verificationMethod: 'Test',
        },
        {
          title: 'All event fields are persisted',
          verificationMethod: 'Inspection',
        },
      ],
    },
    {
      requirementId: 'URS-WD-002',
      title: 'Material identification',
      statement:
        'The solution shall associate each weighing event with the raw material identity (material code, lot number, supplier).',
      rationale:
        'Material, lot, and supplier linkage is required for traceability and batch release.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'INPUT_PORT',
        requirementNature: 'FUNCTIONAL',
        criticality: 'HIGH',
      },
      gxpRelevance: GxPRelevance.DIRECT,
      acceptanceCriteria: [
        {
          title: 'Each event carries material code, lot, and supplier',
          verificationMethod: 'Inspection',
        },
      ],
    },
    {
      requirementId: 'URS-WD-003',
      title: 'Target weight validation',
      statement:
        'The solution shall validate each dispensed weight against the prescribed target range and reject out-of-tolerance weights.',
      rationale:
        'Prevents out-of-tolerance dispensing from reaching the batch.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'PROCESSING',
        requirementNature: 'FUNCTIONAL',
        criticality: 'CRITICAL',
      },
      gxpRelevance: GxPRelevance.DIRECT,
      acceptanceCriteria: [
        {
          title: 'In-tolerance weight is accepted',
          verificationMethod: 'Test',
        },
        {
          title: 'Out-of-tolerance weight is rejected and flagged',
          verificationMethod: 'Test',
        },
      ],
    },
    {
      requirementId: 'URS-WD-004',
      title: 'Dispense sequence enforcement',
      statement:
        'The solution shall enforce the dispensing sequence for a production order and prevent out-of-order or duplicate dispensing.',
      rationale:
        'Ensures order compliance and prevents cross-contamination between materials.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'PROCESSING',
        requirementNature: 'FUNCTIONAL',
        criticality: 'HIGH',
      },
      gxpRelevance: GxPRelevance.DIRECT,
      acceptanceCriteria: [
        {
          title: 'Out-of-order dispensing is blocked',
          verificationMethod: 'Test',
        },
        {
          title: 'Duplicate dispensing is prevented',
          verificationMethod: 'Test',
        },
      ],
    },
    {
      requirementId: 'URS-WD-005',
      title: 'Immutable audit trail',
      statement:
        'The solution shall record an immutable, attributable audit trail of every weighing (who, what, when, scale, value) in line with ALCOA+ and 21 CFR Part 11.',
      rationale:
        'ALCOA+ and 21 CFR Part 11 require attributable, tamper-evident records.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'GOVERNANCE',
        requirementNature: 'COMPLIANCE',
        criticality: 'CRITICAL',
      },
      gxpRelevance: GxPRelevance.DIRECT,
      acceptanceCriteria: [
        {
          title: 'Every weighing records who, what, when, scale, and value',
          verificationMethod: 'Inspection',
        },
        {
          title: 'Records cannot be altered or deleted',
          verificationMethod: 'Analysis',
        },
      ],
    },
    {
      requirementId: 'URS-WD-006',
      title: 'Batch traceability',
      statement:
        'The solution shall link each weighing to its production order and batch so the complete dispensing history of a batch is traceable.',
      rationale:
        'Links weighing to order and batch for a complete dispensing history.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'DATA_STORAGE',
        requirementNature: 'COMPLIANCE',
        criticality: 'HIGH',
      },
      gxpRelevance: GxPRelevance.DIRECT,
      acceptanceCriteria: [
        {
          title: 'Dispensing history is retrievable per batch',
          verificationMethod: 'Demonstration',
        },
      ],
    },
    {
      requirementId: 'URS-WD-007',
      title: 'Dispensing status output',
      statement:
        'The solution shall expose the current dispensing status (material, target, dispensed, remaining) via a REST API.',
      rationale:
        'Operators and downstream systems need the current dispensing status.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'OUTPUT_PORT',
        requirementNature: 'FUNCTIONAL',
        criticality: 'HIGH',
        interfaceType: 'REST',
      },
      gxpRelevance: GxPRelevance.DIRECT,
      acceptanceCriteria: [
        {
          title: 'REST API returns material, target, dispensed, and remaining',
          verificationMethod: 'Test',
        },
      ],
    },
    {
      requirementId: 'URS-WD-008',
      title: 'Electronic signature',
      statement:
        'The solution shall require an electronic signature to confirm each dispensing step and to approve any correction.',
      rationale:
        '21 CFR Part 11 requires signed confirmation of dispensing steps and corrections.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'GOVERNANCE',
        requirementNature: 'COMPLIANCE',
        criticality: 'CRITICAL',
      },
      gxpRelevance: GxPRelevance.DIRECT,
      acceptanceCriteria: [
        {
          title: 'Signature is required to confirm a dispensing step',
          verificationMethod: 'Test',
        },
        {
          title: 'Signature is required to approve a correction',
          verificationMethod: 'Test',
        },
      ],
    },
    {
      requirementId: 'URS-WD-009',
      title: 'Device health observability',
      statement:
        'The solution shall expose health and connectivity status of the connected balance for operations monitoring.',
      rationale:
        'Operations must detect balance connectivity loss early.',
      priority: RequirementPriority.SHOULD,
      classification: {
        componentType: 'OBSERVABILITY',
        requirementNature: 'OPERABILITY',
        criticality: 'MEDIUM',
      },
      gxpRelevance: GxPRelevance.DIRECT,
      acceptanceCriteria: [
        {
          title: 'Health and connectivity status is exposed',
          verificationMethod: 'Inspection',
        },
      ],
    },
    {
      requirementId: 'URS-WD-010',
      title: 'Status availability SLO',
      statement:
        'The solution shall make the latest dispensing status available within 5 seconds of the weighing event.',
      rationale:
        'Timely status is needed to keep the dispensing process flowing.',
      priority: RequirementPriority.SHOULD,
      classification: {
        componentType: 'OBSERVABILITY',
        requirementNature: 'AVAILABILITY',
        criticality: 'MEDIUM',
      },
      gxpRelevance: GxPRelevance.DIRECT,
      acceptanceCriteria: [
        {
          title: 'Latest status is available within 5 seconds of the event',
          verificationMethod: 'Test',
        },
      ],
    },
  ],
};

/**
 * Equipment Performance Management (make) — example URS.
 */
export const EPM_REQUIREMENT_SET: SeedRequirementSet = {
  requirementSetId: 'URS-EPM',
  businessCapabilityRefs: [
    'business-capability:make/equipment-performance-management',
  ],
  businessNeed:
    'Operations must understand equipment effectiveness and its major losses so improvement and maintenance can be prioritized on evidence.',
  desiredOutcome:
    'Reliable OEE and loss visibility per equipment asset, available for daily operations review.',
  businessValue:
    'Focuses improvement and maintenance effort on the largest measured losses instead of guesswork.',
  stakeholders: [
    'role:line-lead',
    'role:production-supervisor',
    'role:process-engineer',
  ],
  processContext:
    'Production equipment across manufacturing lines, monitored during and after runs.',
  scope:
    'OEE computation, loss categorization, equipment event ingestion, performance metrics output, and metric definition traceability.',
  outOfScope:
    'Maintenance work-order execution and automated equipment control or setpoint changes.',
  solutionType: SolutionType.DATA_PRODUCT,
  solutionName: 'Equipment Performance Management',
  gxpRelevance: GxPRelevance.INDIRECT,
  patientImpact: false,
  dataIntegrityImpact: false,
  electronicRecords: false,
  requirements: [
    {
      requirementId: 'URS-EPM-001',
      title: 'OEE computation',
      statement:
        'The solution shall compute Overall Equipment Effectiveness from availability, performance, and quality for each equipment asset.',
      rationale:
        'OEE is the primary measure operations uses to compare equipment effectiveness.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'PROCESSING',
        requirementNature: 'FUNCTIONAL',
        criticality: 'HIGH',
      },
      gxpRelevance: GxPRelevance.INDIRECT,
      acceptanceCriteria: [
        {
          title: 'OEE equals availability x performance x quality per asset',
          verificationMethod: 'Test',
        },
      ],
    },
    {
      requirementId: 'URS-EPM-002',
      title: 'Loss categorization',
      statement:
        'The solution shall categorize equipment downtime into the major loss types of availability, performance, and quality.',
      rationale:
        'Categorized losses make improvement priorities actionable.',
      priority: RequirementPriority.SHOULD,
      classification: {
        componentType: 'PROCESSING',
        requirementNature: 'FUNCTIONAL',
        criticality: 'MEDIUM',
      },
      gxpRelevance: GxPRelevance.INDIRECT,
      acceptanceCriteria: [
        {
          title: 'Each downtime event maps to exactly one loss type',
          verificationMethod: 'Analysis',
        },
      ],
    },
    {
      requirementId: 'URS-EPM-003',
      title: 'Equipment event ingestion',
      statement:
        'The solution shall ingest equipment run, stop, and cycle events from the connected data sources.',
      rationale:
        'Run, stop, and cycle events are the raw input for every performance metric.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'INPUT_PORT',
        requirementNature: 'FUNCTIONAL',
        criticality: 'HIGH',
        interfaceType: 'EVENT',
      },
      gxpRelevance: GxPRelevance.INDIRECT,
      acceptanceCriteria: [
        {
          title: 'Run, stop, and cycle events are ingested from source',
          verificationMethod: 'Test',
        },
      ],
    },
    {
      requirementId: 'URS-EPM-004',
      title: 'Performance metrics output',
      statement:
        'The solution shall expose equipment performance metrics through a queryable API for operational dashboards.',
      rationale:
        'Dashboards and reviews need programmatic access to the metrics.',
      priority: RequirementPriority.SHOULD,
      classification: {
        componentType: 'OUTPUT_PORT',
        requirementNature: 'OPERABILITY',
        criticality: 'MEDIUM',
        interfaceType: 'REST',
      },
      gxpRelevance: GxPRelevance.INDIRECT,
      acceptanceCriteria: [
        {
          title: 'API returns metrics for a given asset and time range',
          verificationMethod: 'Test',
        },
      ],
    },
    {
      requirementId: 'URS-EPM-005',
      title: 'Metric definition traceability',
      statement:
        'The solution shall record the definition and version of each performance metric used in calculations.',
      rationale:
        'Versioned definitions keep metrics comparable over time.',
      priority: RequirementPriority.SHOULD,
      classification: {
        componentType: 'GOVERNANCE',
        requirementNature: 'MAINTAINABILITY',
        criticality: 'MEDIUM',
      },
      gxpRelevance: GxPRelevance.INDIRECT,
      acceptanceCriteria: [
        {
          title: 'Each metric stores its definition and version',
          verificationMethod: 'Inspection',
        },
      ],
    },
  ],
};

/**
 * Equipment Usage Management (make) — example URS.
 */
export const EUM_REQUIREMENT_SET: SeedRequirementSet = {
  requirementSetId: 'URS-EUM',
  businessCapabilityRefs: [
    'business-capability:make/equipment-usage-management',
  ],
  businessNeed:
    'Operations must determine when equipment was used and for which manufacturing context to support utilization analysis and batch attribution.',
  desiredOutcome:
    'A queryable usage history that links every equipment session to its production order, batch, and product.',
  businessValue:
    'Improves utilization planning and supports attribution during investigation.',
  stakeholders: ['role:line-lead', 'role:production-supervisor'],
  processContext:
    'Equipment usage during production, attributed to the active manufacturing context.',
  scope:
    'Usage session capture, manufacturing context linkage, usage history query, utilization aggregation, and usage attribution integrity.',
  outOfScope:
    'Equipment performance/OEE calculation and maintenance scheduling.',
  solutionType: SolutionType.DATA_PRODUCT,
  solutionName: 'Equipment Usage Management',
  gxpRelevance: GxPRelevance.INDIRECT,
  patientImpact: false,
  dataIntegrityImpact: true,
  electronicRecords: true,
  requirements: [
    {
      requirementId: 'URS-EUM-001',
      title: 'Usage session capture',
      statement:
        'The solution shall capture equipment usage sessions with start, end, and operating context.',
      rationale:
        'Sessions are the unit of usage history and utilization analysis.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'INPUT_PORT',
        requirementNature: 'FUNCTIONAL',
        criticality: 'HIGH',
        interfaceType: 'EVENT',
      },
      gxpRelevance: GxPRelevance.INDIRECT,
      acceptanceCriteria: [
        {
          title: 'Each session records start, end, and context',
          verificationMethod: 'Test',
        },
      ],
    },
    {
      requirementId: 'URS-EUM-002',
      title: 'Manufacturing context linkage',
      statement:
        'The solution shall link each usage session to its manufacturing context including production order, batch, and product.',
      rationale:
        'Context linkage is what makes usage attributable to a batch.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'PROCESSING',
        requirementNature: 'FUNCTIONAL',
        criticality: 'HIGH',
      },
      gxpRelevance: GxPRelevance.INDIRECT,
      acceptanceCriteria: [
        {
          title: 'Session resolves to production order, batch, and product',
          verificationMethod: 'Test',
        },
      ],
    },
    {
      requirementId: 'URS-EUM-003',
      title: 'Usage history query',
      statement:
        'The solution shall provide a queryable history of equipment usage per asset and time range.',
      rationale:
        'Operations reviews usage by asset and period.',
      priority: RequirementPriority.SHOULD,
      classification: {
        componentType: 'OUTPUT_PORT',
        requirementNature: 'OPERABILITY',
        criticality: 'MEDIUM',
        interfaceType: 'REST',
      },
      gxpRelevance: GxPRelevance.INDIRECT,
      acceptanceCriteria: [
        {
          title: 'API returns usage history for asset and time range',
          verificationMethod: 'Test',
        },
      ],
    },
    {
      requirementId: 'URS-EUM-004',
      title: 'Utilization aggregation',
      statement:
        'The solution shall aggregate equipment utilization over configurable time periods.',
      rationale:
        'Aggregated utilization supports capacity and planning decisions.',
      priority: RequirementPriority.SHOULD,
      classification: {
        componentType: 'PROCESSING',
        requirementNature: 'FUNCTIONAL',
        criticality: 'MEDIUM',
      },
      gxpRelevance: GxPRelevance.INDIRECT,
      acceptanceCriteria: [
        {
          title: 'Utilization aggregates over the configured period',
          verificationMethod: 'Analysis',
        },
      ],
    },
    {
      requirementId: 'URS-EUM-005',
      title: 'Usage attribution integrity',
      statement:
        'The solution shall ensure usage records are attributable and protected against unrecorded modification.',
      rationale:
        'Attribution integrity keeps usage records trustworthy for investigation.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'GOVERNANCE',
        requirementNature: 'DATA_QUALITY',
        criticality: 'HIGH',
      },
      gxpRelevance: GxPRelevance.INDIRECT,
      acceptanceCriteria: [
        {
          title: 'Every usage record stores an attributable actor',
          verificationMethod: 'Inspection',
        },
      ],
    },
  ],
};

/**
 * Environmental Monitoring (make) — example URS, GxP DIRECT.
 */
export const EM_REQUIREMENT_SET: SeedRequirementSet = {
  requirementSetId: 'URS-EM',
  businessCapabilityRefs: [
    'business-capability:make/environmental-monitoring',
  ],
  businessNeed:
    'Quality and operations must monitor environmental conditions in GxP manufacturing areas and respond to excursions that could affect product quality.',
  desiredOutcome:
    'Continuous environmental visibility with timely, attributable excursion response.',
  businessValue:
    'Protects product quality and provides compliant monitoring records for release and audit.',
  stakeholders: [
    'role:quality-technician',
    'role:process-engineer',
    'role:production-supervisor',
  ],
  processContext:
    'Monitoring of temperature, humidity, and pressure in classified GxP manufacturing and storage areas.',
  scope:
    'Sensor data ingestion, excursion detection, excursion alerting, ALCOA monitoring records, and monitoring data retention.',
  outOfScope:
    'HVAC control loops and automatic remediation of environmental excursions.',
  solutionType: SolutionType.COMPONENT,
  solutionName: 'Environmental Monitoring',
  gxpRelevance: GxPRelevance.DIRECT,
  patientImpact: true,
  dataIntegrityImpact: true,
  electronicRecords: true,
  requirements: [
    {
      requirementId: 'URS-EM-001',
      title: 'Sensor data ingestion',
      statement:
        'The solution shall ingest temperature, humidity, and pressure readings from connected environmental sensors.',
      rationale:
        'Sensor readings are the basis for monitoring and excursion detection.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'INPUT_PORT',
        requirementNature: 'FUNCTIONAL',
        criticality: 'HIGH',
        interfaceType: 'MQTT',
      },
      gxpRelevance: GxPRelevance.DIRECT,
      acceptanceCriteria: [
        {
          title: 'Temperature, humidity, and pressure readings are ingested',
          verificationMethod: 'Test',
        },
      ],
    },
    {
      requirementId: 'URS-EM-002',
      title: 'Excursion detection',
      statement:
        'The solution shall detect excursions outside the configured environmental limits in near real time.',
      rationale:
        'Early detection limits the product at risk during an excursion.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'PROCESSING',
        requirementNature: 'FUNCTIONAL',
        criticality: 'CRITICAL',
      },
      gxpRelevance: GxPRelevance.DIRECT,
      acceptanceCriteria: [
        {
          title: 'Reading outside configured limits raises an excursion',
          verificationMethod: 'Test',
        },
      ],
    },
    {
      requirementId: 'URS-EM-003',
      title: 'Excursion alerting',
      statement:
        'The solution shall raise an alert to the responsible role when an environmental excursion occurs.',
      rationale:
        'The responsible role must act on an excursion promptly.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'OUTPUT_PORT',
        requirementNature: 'OPERABILITY',
        criticality: 'HIGH',
        interfaceType: 'EVENT',
      },
      gxpRelevance: GxPRelevance.DIRECT,
      acceptanceCriteria: [
        {
          title: 'Alert is delivered to the responsible role on excursion',
          verificationMethod: 'Test',
        },
      ],
    },
    {
      requirementId: 'URS-EM-004',
      title: 'ALCOA monitoring record',
      statement:
        'The solution shall record environmental data as an attributable, immutable audit trail in line with ALCOA+ and 21 CFR Part 11.',
      rationale:
        'Monitoring records are GxP evidence and must be tamper-evident.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'GOVERNANCE',
        requirementNature: 'COMPLIANCE',
        criticality: 'CRITICAL',
      },
      gxpRelevance: GxPRelevance.DIRECT,
      acceptanceCriteria: [
        {
          title: 'Records are attributable and cannot be altered',
          verificationMethod: 'Analysis',
        },
      ],
    },
    {
      requirementId: 'URS-EM-005',
      title: 'Monitoring data retention',
      statement:
        'The solution shall retain environmental monitoring records for the configured retention period.',
      rationale:
        'Retention is required for audit and product lifecycle review.',
      priority: RequirementPriority.SHOULD,
      classification: {
        componentType: 'DATA_STORAGE',
        requirementNature: 'COMPLIANCE',
        criticality: 'MEDIUM',
      },
      gxpRelevance: GxPRelevance.DIRECT,
      acceptanceCriteria: [
        {
          title: 'Records remain retrievable for the retention period',
          verificationMethod: 'Inspection',
        },
      ],
    },
  ],
};

/**
 * Batch Traceability (make) — example URS, GxP DIRECT.
 */
export const BT_REQUIREMENT_SET: SeedRequirementSet = {
  requirementSetId: 'URS-BT',
  businessCapabilityRefs: ['business-capability:make/batch-traceability'],
  businessNeed:
    'Quality must maintain complete traceability of material batches through manufacturing to support batch release and investigation.',
  desiredOutcome:
    'Forward and backward genealogy for any batch or material lot, available on demand.',
  businessValue:
    'Speeds investigation and recall scoping and underpins confident batch release.',
  stakeholders: [
    'role:quality-technician',
    'role:production-supervisor',
    'role:line-lead',
  ],
  processContext:
    'Material consumption and production events across manufacturing, linked to batches.',
  scope:
    'Batch genealogy capture, material-to-batch linkage, traceability query, record integrity, and investigation export.',
  outOfScope:
    'Distribution and logistics traceability beyond the manufacturing site.',
  solutionType: SolutionType.DATA_PRODUCT,
  solutionName: 'Batch Traceability',
  gxpRelevance: GxPRelevance.DIRECT,
  patientImpact: true,
  dataIntegrityImpact: true,
  electronicRecords: true,
  requirements: [
    {
      requirementId: 'URS-BT-001',
      title: 'Batch genealogy capture',
      statement:
        'The solution shall capture the genealogy of each batch including all consumed material lots and equipment used.',
      rationale:
        'Complete genealogy is the foundation of traceability.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'DATA_STORAGE',
        requirementNature: 'COMPLIANCE',
        criticality: 'CRITICAL',
      },
      gxpRelevance: GxPRelevance.DIRECT,
      acceptanceCriteria: [
        {
          title: 'Genealogy lists all consumed lots and equipment',
          verificationMethod: 'Inspection',
        },
      ],
    },
    {
      requirementId: 'URS-BT-002',
      title: 'Material-to-batch linkage',
      statement:
        'The solution shall link every material lot to the batches in which it was used.',
      rationale:
        'Lot-to-batch linkage enables forward and backward tracing.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'PROCESSING',
        requirementNature: 'FUNCTIONAL',
        criticality: 'HIGH',
      },
      gxpRelevance: GxPRelevance.DIRECT,
      acceptanceCriteria: [
        {
          title: 'Each lot resolves to every batch that consumed it',
          verificationMethod: 'Test',
        },
      ],
    },
    {
      requirementId: 'URS-BT-003',
      title: 'Traceability query',
      statement:
        'The solution shall provide forward and backward traceability queries for any batch or material lot.',
      rationale:
        'Investigators need both directions to scope impact.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'OUTPUT_PORT',
        requirementNature: 'OPERABILITY',
        criticality: 'HIGH',
        interfaceType: 'REST',
      },
      gxpRelevance: GxPRelevance.DIRECT,
      acceptanceCriteria: [
        {
          title: 'Forward and backward queries return linked records',
          verificationMethod: 'Test',
        },
      ],
    },
    {
      requirementId: 'URS-BT-004',
      title: 'Traceability record integrity',
      statement:
        'The solution shall protect traceability records against modification with a complete attributable audit trail in line with ALCOA+ and 21 CFR Part 11.',
      rationale:
        'Traceability is only credible if records are tamper-evident.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'GOVERNANCE',
        requirementNature: 'COMPLIANCE',
        criticality: 'CRITICAL',
      },
      gxpRelevance: GxPRelevance.DIRECT,
      acceptanceCriteria: [
        {
          title: 'Modifications are recorded with actor and timestamp',
          verificationMethod: 'Analysis',
        },
      ],
    },
    {
      requirementId: 'URS-BT-005',
      title: 'Investigation export',
      statement:
        'The solution shall export a batch traceability record for quality investigation and batch release.',
      rationale:
        'Export supports investigation and release documentation.',
      priority: RequirementPriority.SHOULD,
      classification: {
        componentType: 'DOCUMENTATION',
        requirementNature: 'OPERABILITY',
        criticality: 'MEDIUM',
      },
      gxpRelevance: GxPRelevance.DIRECT,
      acceptanceCriteria: [
        {
          title: 'Batch record exports in a reviewable format',
          verificationMethod: 'Demonstration',
        },
      ],
    },
  ],
};

/**
 * Compliance Documentation (quality) — example URS, GxP DIRECT.
 */
export const CD_REQUIREMENT_SET: SeedRequirementSet = {
  requirementSetId: 'URS-CD',
  businessCapabilityRefs: [
    'business-capability:quality/compliance-documentation',
  ],
  businessNeed:
    'Quality must generate and maintain controlled compliance documentation required for regulatory submissions and audits.',
  desiredOutcome:
    'Controlled, approved compliance documents generated from approved data sources and retrievable on demand.',
  businessValue:
    'Reduces documentation effort and audit risk through controlled, traceable documents.',
  stakeholders: ['role:quality-technician', 'role:process-engineer'],
  processContext:
    'Creation, review, approval, and retention of GxP compliance documentation.',
  scope:
    'Document generation, version control, review and approval, audit trail, and retention/retrieval.',
  outOfScope:
    'Authoring of narrative content and external regulatory submission portals.',
  solutionType: SolutionType.COMPONENT,
  solutionName: 'Compliance Documentation',
  gxpRelevance: GxPRelevance.DIRECT,
  patientImpact: false,
  dataIntegrityImpact: true,
  electronicRecords: true,
  requirements: [
    {
      requirementId: 'URS-CD-001',
      title: 'Document generation',
      statement:
        'The solution shall generate compliance documents from approved controlled data sources.',
      rationale:
        'Generation from controlled sources keeps documents consistent and current.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'PROCESSING',
        requirementNature: 'FUNCTIONAL',
        criticality: 'HIGH',
      },
      gxpRelevance: GxPRelevance.DIRECT,
      acceptanceCriteria: [
        {
          title: 'Document is generated only from approved sources',
          verificationMethod: 'Test',
        },
      ],
    },
    {
      requirementId: 'URS-CD-002',
      title: 'Document version control',
      statement:
        'The solution shall maintain version control and approval state for each compliance document.',
      rationale:
        'Version control prevents use of outdated documents.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'GOVERNANCE',
        requirementNature: 'COMPLIANCE',
        criticality: 'CRITICAL',
      },
      gxpRelevance: GxPRelevance.DIRECT,
      acceptanceCriteria: [
        {
          title: 'Each document shows its version and approval state',
          verificationMethod: 'Inspection',
        },
      ],
    },
    {
      requirementId: 'URS-CD-003',
      title: 'Review and approval',
      statement:
        'The solution shall require documented review and electronic approval before a compliance document is released.',
      rationale:
        'Release requires documented review and approval.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'GOVERNANCE',
        requirementNature: 'COMPLIANCE',
        criticality: 'HIGH',
      },
      gxpRelevance: GxPRelevance.DIRECT,
      acceptanceCriteria: [
        {
          title: 'Document cannot be released without recorded approval',
          verificationMethod: 'Test',
        },
      ],
    },
    {
      requirementId: 'URS-CD-004',
      title: 'Document audit trail',
      statement:
        'The solution shall record an immutable attributable audit trail of document creation, change, and approval in line with 21 CFR Part 11.',
      rationale:
        'Part 11 requires a tamper-evident document history.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'GOVERNANCE',
        requirementNature: 'COMPLIANCE',
        criticality: 'CRITICAL',
      },
      gxpRelevance: GxPRelevance.DIRECT,
      acceptanceCriteria: [
        {
          title: 'Create, change, and approval events are recorded attributable',
          verificationMethod: 'Analysis',
        },
      ],
    },
    {
      requirementId: 'URS-CD-005',
      title: 'Retention and retrieval',
      statement:
        'The solution shall retain compliance documents and allow retrieval for the configured retention period.',
      rationale:
        'Retention and retrieval are required for audit.',
      priority: RequirementPriority.SHOULD,
      classification: {
        componentType: 'DATA_STORAGE',
        requirementNature: 'COMPLIANCE',
        criticality: 'MEDIUM',
      },
      gxpRelevance: GxPRelevance.DIRECT,
      acceptanceCriteria: [
        {
          title: 'Documents are retrievable for the retention period',
          verificationMethod: 'Inspection',
        },
      ],
    },
  ],
};

/**
 * Change Management (quality) — example URS, GxP DIRECT.
 */
export const CM_REQUIREMENT_SET: SeedRequirementSet = {
  requirementSetId: 'URS-CM',
  businessCapabilityRefs: ['business-capability:quality/change-management'],
  businessNeed:
    'Quality must control and document changes to manufacturing processes and systems with documented impact assessment and approval.',
  desiredOutcome:
    'Every change is assessed, approved, implemented, and traceable to the requirements and validation it affects.',
  businessValue:
    'Prevents uncontrolled change and reduces validation and compliance risk.',
  stakeholders: [
    'role:quality-technician',
    'role:process-engineer',
    'role:production-supervisor',
  ],
  processContext:
    'Change control across manufacturing processes, equipment, and GxP systems.',
  scope:
    'Change request capture, impact assessment, approval workflow, change audit trail, and traceability to requirements.',
  outOfScope:
    'Execution of the technical change itself and project/task management.',
  solutionType: SolutionType.PROJECT,
  solutionName: 'Change Management',
  gxpRelevance: GxPRelevance.DIRECT,
  patientImpact: true,
  dataIntegrityImpact: true,
  electronicRecords: true,
  requirements: [
    {
      requirementId: 'URS-CM-001',
      title: 'Change request capture',
      statement:
        'The solution shall capture change requests with scope, reason, and the affected items.',
      rationale:
        'A structured request is the entry point of change control.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'PROCESSING',
        requirementNature: 'FUNCTIONAL',
        criticality: 'HIGH',
      },
      gxpRelevance: GxPRelevance.DIRECT,
      acceptanceCriteria: [
        {
          title: 'Request records scope, reason, and affected items',
          verificationMethod: 'Inspection',
        },
      ],
    },
    {
      requirementId: 'URS-CM-002',
      title: 'Impact assessment',
      statement:
        'The solution shall record a documented impact assessment including GxP and validation impact for each change.',
      rationale:
        'Impact assessment determines the required approval and validation effort.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'GOVERNANCE',
        requirementNature: 'COMPLIANCE',
        criticality: 'CRITICAL',
      },
      gxpRelevance: GxPRelevance.DIRECT,
      acceptanceCriteria: [
        {
          title: 'GxP and validation impact are recorded before approval',
          verificationMethod: 'Test',
        },
      ],
    },
    {
      requirementId: 'URS-CM-003',
      title: 'Change approval workflow',
      statement:
        'The solution shall enforce role-based review and approval before a change is authorized for implementation.',
      rationale:
        'Role-based approval enforces segregation of duties.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'GOVERNANCE',
        requirementNature: 'COMPLIANCE',
        criticality: 'HIGH',
      },
      gxpRelevance: GxPRelevance.DIRECT,
      acceptanceCriteria: [
        {
          title: 'Change cannot be authorized without required approvals',
          verificationMethod: 'Test',
        },
      ],
    },
    {
      requirementId: 'URS-CM-004',
      title: 'Change audit trail',
      statement:
        'The solution shall maintain an immutable attributable audit trail of the change lifecycle in line with ALCOA+ and 21 CFR Part 11.',
      rationale:
        'The lifecycle history is GxP evidence of controlled change.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'GOVERNANCE',
        requirementNature: 'COMPLIANCE',
        criticality: 'CRITICAL',
      },
      gxpRelevance: GxPRelevance.DIRECT,
      acceptanceCriteria: [
        {
          title: 'Lifecycle states are recorded attributable and immutable',
          verificationMethod: 'Analysis',
        },
      ],
    },
    {
      requirementId: 'URS-CM-005',
      title: 'Traceability to requirements',
      statement:
        'The solution shall link each implemented change to the affected requirements and validation records.',
      rationale:
        'Linkage shows which requirements and validation a change touches.',
      priority: RequirementPriority.SHOULD,
      classification: {
        componentType: 'DATA_CONTRACT',
        requirementNature: 'COMPLIANCE',
        criticality: 'MEDIUM',
      },
      gxpRelevance: GxPRelevance.DIRECT,
      acceptanceCriteria: [
        {
          title: 'Change lists affected requirements and validation records',
          verificationMethod: 'Demonstration',
        },
      ],
    },
  ],
};

/**
 * Material Inventory Management (supply) — example URS.
 */
export const MI_REQUIREMENT_SET: SeedRequirementSet = {
  requirementSetId: 'URS-MI',
  businessCapabilityRefs: ['business-capability:supply/material-inventory'],
  businessNeed:
    'Supply and operations must track material inventory across sites including quantity, location, and release status to prevent use of non-released material.',
  desiredOutcome:
    'Accurate, current inventory per material lot with enforced release status.',
  businessValue:
    'Prevents use of non-released material and improves stock accuracy.',
  stakeholders: [
    'role:line-lead',
    'role:dispensing-operator',
    'role:production-supervisor',
  ],
  processContext:
    'Material receipt, storage, issue, return, and adjustment across manufacturing sites.',
  scope:
    'Inventory transaction capture, stock level tracking, material status enforcement, inventory query, and movement attribution.',
  outOfScope:
    'Supplier procurement, purchasing, and financial inventory valuation.',
  solutionType: SolutionType.COMPONENT,
  solutionName: 'Material Inventory Management',
  gxpRelevance: GxPRelevance.INDIRECT,
  patientImpact: false,
  dataIntegrityImpact: true,
  electronicRecords: true,
  requirements: [
    {
      requirementId: 'URS-MI-001',
      title: 'Inventory transaction capture',
      statement:
        'The solution shall capture material movements such as receipt, issue, return, and adjustment as inventory transactions.',
      rationale:
        'Transactions are the source of truth for stock levels.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'INPUT_PORT',
        requirementNature: 'FUNCTIONAL',
        criticality: 'HIGH',
        interfaceType: 'EVENT',
      },
      gxpRelevance: GxPRelevance.INDIRECT,
      acceptanceCriteria: [
        {
          title: 'Receipt, issue, return, and adjustment are captured',
          verificationMethod: 'Test',
        },
      ],
    },
    {
      requirementId: 'URS-MI-002',
      title: 'Stock level tracking',
      statement:
        'The solution shall maintain current stock quantity, location, and status for each material lot.',
      rationale:
        'Current stock per lot is needed for dispensing and planning.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'DATA_STORAGE',
        requirementNature: 'FUNCTIONAL',
        criticality: 'HIGH',
      },
      gxpRelevance: GxPRelevance.INDIRECT,
      acceptanceCriteria: [
        {
          title: 'Quantity, location, and status are current per lot',
          verificationMethod: 'Inspection',
        },
      ],
    },
    {
      requirementId: 'URS-MI-003',
      title: 'Material status enforcement',
      statement:
        'The solution shall enforce material status such as quarantine, released, and rejected and prevent use of non-released material.',
      rationale:
        'Prevents non-released material from entering production.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'PROCESSING',
        requirementNature: 'FUNCTIONAL',
        criticality: 'HIGH',
      },
      gxpRelevance: GxPRelevance.INDIRECT,
      acceptanceCriteria: [
        {
          title: 'Issue of non-released material is blocked',
          verificationMethod: 'Test',
        },
      ],
    },
    {
      requirementId: 'URS-MI-004',
      title: 'Inventory query',
      statement:
        'The solution shall expose current inventory and transaction history through a queryable API.',
      rationale:
        'Operations and supply need programmatic access to stock.',
      priority: RequirementPriority.SHOULD,
      classification: {
        componentType: 'OUTPUT_PORT',
        requirementNature: 'OPERABILITY',
        criticality: 'MEDIUM',
        interfaceType: 'REST',
      },
      gxpRelevance: GxPRelevance.INDIRECT,
      acceptanceCriteria: [
        {
          title: 'API returns current inventory and history',
          verificationMethod: 'Test',
        },
      ],
    },
    {
      requirementId: 'URS-MI-005',
      title: 'Movement attribution',
      statement:
        'The solution shall record each inventory transaction with an attributable actor and timestamp.',
      rationale:
        'Attribution keeps inventory movements trustworthy.',
      priority: RequirementPriority.SHOULD,
      classification: {
        componentType: 'GOVERNANCE',
        requirementNature: 'DATA_QUALITY',
        criticality: 'MEDIUM',
      },
      gxpRelevance: GxPRelevance.INDIRECT,
      acceptanceCriteria: [
        {
          title: 'Each transaction stores actor and timestamp',
          verificationMethod: 'Inspection',
        },
      ],
    },
  ],
};

/**
 * Supplier Quality Management (supply) — example URS, GxP DIRECT.
 */
export const SQ_REQUIREMENT_SET: SeedRequirementSet = {
  requirementSetId: 'URS-SQ',
  businessCapabilityRefs: ['business-capability:supply/supplier-quality'],
  businessNeed:
    'Quality must monitor and assess the quality of materials from suppliers to protect product quality and support supplier qualification.',
  desiredOutcome:
    'Qualified suppliers with assessed performance and tracked non-conformances.',
  businessValue:
    'Reduces incoming quality risk and supports supplier qualification decisions.',
  stakeholders: ['role:quality-technician', 'role:process-engineer'],
  processContext:
    'Incoming material quality, supplier qualification, and supplier performance review.',
  scope:
    'Supplier qualification record, incoming quality data ingestion, performance assessment, non-conformance handling, and assessment audit trail.',
  outOfScope:
    'Commercial supplier onboarding, contracts, and procurement negotiations.',
  solutionType: SolutionType.DATA_PRODUCT,
  solutionName: 'Supplier Quality Management',
  gxpRelevance: GxPRelevance.DIRECT,
  patientImpact: true,
  dataIntegrityImpact: true,
  electronicRecords: true,
  requirements: [
    {
      requirementId: 'URS-SQ-001',
      title: 'Supplier qualification record',
      statement:
        'The solution shall maintain a qualification status and record for each supplier.',
      rationale:
        'Only qualified suppliers may provide GxP material.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'DATA_STORAGE',
        requirementNature: 'COMPLIANCE',
        criticality: 'CRITICAL',
      },
      gxpRelevance: GxPRelevance.DIRECT,
      acceptanceCriteria: [
        {
          title: 'Each supplier has a qualification status and record',
          verificationMethod: 'Inspection',
        },
      ],
    },
    {
      requirementId: 'URS-SQ-002',
      title: 'Incoming quality data ingestion',
      statement:
        'The solution shall ingest incoming inspection and certificate-of-analysis data for supplier materials.',
      rationale:
        'Incoming data feeds assessment and non-conformance detection.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'INPUT_PORT',
        requirementNature: 'FUNCTIONAL',
        criticality: 'HIGH',
        interfaceType: 'REST',
      },
      gxpRelevance: GxPRelevance.DIRECT,
      acceptanceCriteria: [
        {
          title: 'Inspection and CoA data are ingested per delivery',
          verificationMethod: 'Test',
        },
      ],
    },
    {
      requirementId: 'URS-SQ-003',
      title: 'Supplier performance assessment',
      statement:
        'The solution shall assess supplier quality performance from incoming inspection and deviation data.',
      rationale:
        'Assessment drives qualification and improvement actions.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'PROCESSING',
        requirementNature: 'FUNCTIONAL',
        criticality: 'HIGH',
      },
      gxpRelevance: GxPRelevance.DIRECT,
      acceptanceCriteria: [
        {
          title: 'Performance is computed from inspection and deviations',
          verificationMethod: 'Analysis',
        },
      ],
    },
    {
      requirementId: 'URS-SQ-004',
      title: 'Non-conformance handling',
      statement:
        'The solution shall record and track supplier non-conformances through to disposition.',
      rationale:
        'Non-conformances must be tracked to closure.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'GOVERNANCE',
        requirementNature: 'COMPLIANCE',
        criticality: 'HIGH',
      },
      gxpRelevance: GxPRelevance.DIRECT,
      acceptanceCriteria: [
        {
          title: 'Non-conformance tracks from record to disposition',
          verificationMethod: 'Test',
        },
      ],
    },
    {
      requirementId: 'URS-SQ-005',
      title: 'Assessment audit trail',
      statement:
        'The solution shall record supplier qualification and assessment decisions as an attributable immutable audit trail in line with ALCOA+ and 21 CFR Part 11.',
      rationale:
        'Qualification decisions are GxP evidence.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'GOVERNANCE',
        requirementNature: 'COMPLIANCE',
        criticality: 'CRITICAL',
      },
      gxpRelevance: GxPRelevance.DIRECT,
      acceptanceCriteria: [
        {
          title: 'Qualification and assessment decisions are attributable',
          verificationMethod: 'Analysis',
        },
      ],
    },
  ],
};

/**
 * Production Analytics (analytics) — example URS, non-GxP.
 */
export const PA_REQUIREMENT_SET: SeedRequirementSet = {
  requirementSetId: 'URS-PA',
  businessCapabilityRefs: [
    'business-capability:analytics/production-analytics',
  ],
  businessNeed:
    'Operations and engineering must analyze production data to identify trends, bottlenecks, and optimization opportunities.',
  desiredOutcome:
    'Trusted production analytics that surface trends and bottlenecks for decision-making.',
  businessValue:
    'Identifies optimization opportunities and supports evidence-based operations decisions.',
  stakeholders: [
    'role:process-engineer',
    'role:production-supervisor',
    'role:line-lead',
  ],
  processContext:
    'Analysis of production data across lines and shifts for operational insight.',
  scope:
    'Production data aggregation, trend analysis, bottleneck detection, analytics output, and data lineage.',
  outOfScope:
    'GxP batch release decisions and validated quality analytics.',
  solutionType: SolutionType.DATA_PRODUCT,
  solutionName: 'Production Analytics',
  gxpRelevance: GxPRelevance.NONE,
  patientImpact: false,
  dataIntegrityImpact: false,
  electronicRecords: false,
  requirements: [
    {
      requirementId: 'URS-PA-001',
      title: 'Production data aggregation',
      statement:
        'The solution shall aggregate production data across lines, shifts, and time periods for analysis.',
      rationale:
        'Aggregation makes cross-line and cross-shift analysis possible.',
      priority: RequirementPriority.MUST,
      classification: {
        componentType: 'PROCESSING',
        requirementNature: 'FUNCTIONAL',
        criticality: 'HIGH',
      },
      gxpRelevance: GxPRelevance.NONE,
      acceptanceCriteria: [
        {
          title: 'Data aggregates by line, shift, and period',
          verificationMethod: 'Test',
        },
      ],
    },
    {
      requirementId: 'URS-PA-002',
      title: 'Trend analysis',
      statement:
        'The solution shall identify production trends and deviations over configurable time windows.',
      rationale:
        'Trends reveal gradual drift before it becomes a problem.',
      priority: RequirementPriority.SHOULD,
      classification: {
        componentType: 'PROCESSING',
        requirementNature: 'FUNCTIONAL',
        criticality: 'MEDIUM',
      },
      gxpRelevance: GxPRelevance.NONE,
      acceptanceCriteria: [
        {
          title: 'Trends and deviations surface over the configured window',
          verificationMethod: 'Analysis',
        },
      ],
    },
    {
      requirementId: 'URS-PA-003',
      title: 'Bottleneck detection',
      statement:
        'The solution shall detect process bottlenecks from throughput and cycle-time data.',
      rationale:
        'Bottlenecks are the primary target for throughput improvement.',
      priority: RequirementPriority.SHOULD,
      classification: {
        componentType: 'PROCESSING',
        requirementNature: 'FUNCTIONAL',
        criticality: 'MEDIUM',
      },
      gxpRelevance: GxPRelevance.NONE,
      acceptanceCriteria: [
        {
          title: 'Bottlenecks are flagged from throughput and cycle time',
          verificationMethod: 'Analysis',
        },
      ],
    },
    {
      requirementId: 'URS-PA-004',
      title: 'Analytics output',
      statement:
        'The solution shall expose analytics results through a queryable API for reporting tools.',
      rationale:
        'Reporting tools consume analytics programmatically.',
      priority: RequirementPriority.SHOULD,
      classification: {
        componentType: 'OUTPUT_PORT',
        requirementNature: 'OPERABILITY',
        criticality: 'MEDIUM',
        interfaceType: 'REST',
      },
      gxpRelevance: GxPRelevance.NONE,
      acceptanceCriteria: [
        {
          title: 'API returns analytics results for reporting',
          verificationMethod: 'Test',
        },
      ],
    },
    {
      requirementId: 'URS-PA-005',
      title: 'Analytics data lineage',
      statement:
        'The solution shall record the lineage of production data used in each analytic result.',
      rationale:
        'Lineage makes analytic results explainable and auditable.',
      priority: RequirementPriority.SHOULD,
      classification: {
        componentType: 'DISCOVERY_PORT',
        requirementNature: 'DATA_QUALITY',
        criticality: 'LOW',
      },
      gxpRelevance: GxPRelevance.NONE,
      acceptanceCriteria: [
        {
          title: 'Each result records its contributing source data',
          verificationMethod: 'Inspection',
        },
      ],
    },
  ],
};

export const SEED_REQUIREMENT_SETS: SeedRequirementSet[] = [
  WD_REQUIREMENT_SET,
  EPM_REQUIREMENT_SET,
  EUM_REQUIREMENT_SET,
  EM_REQUIREMENT_SET,
  BT_REQUIREMENT_SET,
  CD_REQUIREMENT_SET,
  CM_REQUIREMENT_SET,
  MI_REQUIREMENT_SET,
  SQ_REQUIREMENT_SET,
  PA_REQUIREMENT_SET,
];
