/**
 * URS Create Wizard State Model
 * 
 * Manages the state of the 8-step wizard throughout creation.
 * Separates temporary editing state (React) from persisted state (backend).
 */

import { SolutionType, GxPRelevance, RequirementPriority } from '../../api/types';

/**
 * Draft requirement during editing
 */
export interface RequirementDraft {
  id?: string; // Backend ID after persistence; undefined before
  tempId: string; // Local temp ID for uncontrolled editing
  title: string; // Required by backend
  statement: string;
  rationale?: string;
  category?: string;
  priority?: RequirementPriority;
  gxpRelevance?: GxPRelevance;
  source?: string;
  owner?: string;
  acceptanceCriteria?: AcceptanceCriteriaDraft[];
}

/**
 * Draft acceptance criterion
 */
export interface AcceptanceCriteriaDraft {
  tempId: string;
  title: string;
  description?: string;
  verificationMethod?: string;
}

/**
 * Complete wizard state
 */
export interface URSWizardState {
  // === PERSISTENCE ===
  requirementSetId?: string; // Backend ID if loaded from draft
  isDraft: boolean; // Loaded from backend vs new draft
  dirty: boolean; // Unsaved changes

  // === STEP 1: BUSINESS CAPABILITY ===
  businessCapabilityRefs: string[]; // Array of capability IDs
  selectedCapabilities?: Record<string, boolean>; // UI selection state

  // === STEP 2: BUSINESS NEED ===
  businessNeed: {
    title?: string;
    desiredOutcome?: string;
    businessValue?: string;
    stakeholders?: string[]; // Backend stores as string[], UI manages as comma-separated
  };

  // === STEP 3: URS CONTEXT ===
  context: {
    title?: string;
    scope?: string;
    outOfScope?: string;
    processContext?: string;
    gxpRelevance?: GxPRelevance;
    patientImpact?: boolean;
    dataIntegrityImpact?: boolean;
    electronicRecords?: boolean;
  };

  // === STEP 4: REQUIREMENTS ===
  requirements: RequirementDraft[];

  // === STEP 5: ACCEPTANCE CRITERIA ===
  // (Linked to requirements via requirement.acceptanceCriteria)

  // === STEP 6: QUALITY & GxP REVIEW ===
  qualityChecks?: {
    clarity: 'PASS' | 'WARNING' | 'BLOCKING';
    testability: 'PASS' | 'WARNING' | 'BLOCKING';
    solutionIndependence: 'PASS' | 'WARNING' | 'BLOCKING';
    acceptanceCriteria: 'PASS' | 'WARNING' | 'BLOCKING';
    gxpClassification: 'PASS' | 'WARNING' | 'BLOCKING';
  };

  // === STEP 7: TRACEABILITY ===
  // (Auto-calculated from linked entities)

  // === STEP 8: REVIEW & SUBMIT ===
  solutionType?: SolutionType;
  solutionName?: string;
  solutionCatalogRef?: string;

  regulatoryContext?: {
    patientImpact?: boolean;
    dataIntegrityImpact?: boolean;
    electronicRecords?: boolean;
  };

  // === NAVIGATION ===
  currentStep: number; // 0-7 (0 = step 1, etc.)
}

/**
 * Initialize empty wizard state
 */
export function initializeWizardState(): URSWizardState {
  return {
    isDraft: false,
    dirty: false,
    businessCapabilityRefs: [],
    businessNeed: {},
    context: {},
    requirements: [],
    currentStep: 0,
  };
}

/**
 * Validate step for completion (required fields)
 * Returns: { isValid, errors }
 */
export function validateStep(state: URSWizardState, step: number): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  switch (step) {
    case 0: // Business Capability
      if (state.businessCapabilityRefs.length === 0) {
        errors.push('Select at least one business capability');
      }
      break;

    case 1: // Business Need
      if (!state.businessNeed.title?.trim()) {
        errors.push('Enter business need title');
      }
      if (!state.businessNeed.desiredOutcome?.trim()) {
        errors.push('Describe desired outcome');
      }
      break;

    case 2: // URS Context
      if (!state.context.title?.trim()) {
        errors.push('Enter URS title');
      }
      if (!state.context.scope?.trim()) {
        errors.push('Define URS scope');
      }
      if (!state.context.gxpRelevance) {
        errors.push('Specify GxP relevance');
      }
      break;

    case 3: // Requirements
      if (state.requirements.length === 0) {
        errors.push('Add at least one requirement');
      }
      state.requirements.forEach((req, idx) => {
        if (!req.title?.trim()) {
          errors.push(`Requirement ${idx + 1}: title is required`);
        }
        if (!req.statement?.trim()) {
          errors.push(`Requirement ${idx + 1}: statement is required`);
        }
      });
      break;

    case 4: // Acceptance Criteria
      const reqsWithoutAC = state.requirements.filter(
        r => !r.acceptanceCriteria || r.acceptanceCriteria.length === 0,
      );
      if (reqsWithoutAC.length > 0) {
        errors.push(`${reqsWithoutAC.length} requirement(s) lack acceptance criteria`);
      }
      break;

    case 5: // Quality Review
      // Warning level, not blocking
      break;

    case 6: // Traceability
      // Informational, not blocking
      break;

    case 7: // Review & Submit
      if (!state.solutionName?.trim()) {
        errors.push('Enter solution name');
      }
      if (!state.solutionType) {
        errors.push('Select solution type');
      }
      break;

    default:
      break;
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Mark state as dirty on modification
 */
export function markDirty(state: URSWizardState): URSWizardState {
  return { ...state, dirty: true };
}

/**
 * Mark state as saved
 */
export function markSaved(state: URSWizardState, requirementSetId?: string): URSWizardState {
  return { ...state, dirty: false, isDraft: true, requirementSetId };
}

/**
 * Convert wizard state to CreateRequirementSetRequest for backend
 */
export function toCreateRequirementSetRequest(state: URSWizardState) {
  return {
    businessCapabilityRefs: state.businessCapabilityRefs,
    businessNeed: state.businessNeed.title || state.context.title || '',
    desiredOutcome: state.businessNeed.desiredOutcome,
    businessValue: state.businessNeed.businessValue,
    stakeholders: state.businessNeed.stakeholders,
    processContext: state.context.processContext,
    solutionType: state.solutionType || SolutionType.PROJECT,
    solutionName: state.solutionName || state.context.title || '',
    solutionCatalogRef: state.solutionCatalogRef,
    scope: state.context.scope,
    outOfScope: state.context.outOfScope,
    gxpRelevance: state.context.gxpRelevance,
    patientImpact: state.context.patientImpact,
    dataIntegrityImpact: state.context.dataIntegrityImpact,
    electronicRecords: state.context.electronicRecords,
  };
}

function createTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function serializeAcceptanceCriteria(
  criteria?: AcceptanceCriteriaDraft[],
): string | undefined {
  if (!criteria || criteria.length === 0) {
    return undefined;
  }
  return JSON.stringify(criteria);
}

export function parseAcceptanceCriteria(
  acceptanceIntent?: string,
): AcceptanceCriteriaDraft[] {
  if (!acceptanceIntent) {
    return [];
  }
  try {
    const parsed = JSON.parse(acceptanceIntent);
    if (Array.isArray(parsed)) {
      return parsed.map(item => ({
        tempId: item.tempId || createTempId(),
        title: item.title || '',
        description: item.description,
        verificationMethod: item.verificationMethod,
      }));
    }
  } catch {
    return [{ tempId: createTempId(), title: acceptanceIntent }];
  }
  return [];
}

export function toDraftRequirementsPayload(state: URSWizardState) {
  return state.requirements.map(req => ({
    id: req.id,
    requirementId: req.id,
    title: req.title,
    statement: req.statement,
    rationale: req.rationale,
    category: req.category,
    priority: req.priority,
    gxpRelevance: req.gxpRelevance,
    source: req.source,
    owner: req.owner,
    acceptanceIntent: serializeAcceptanceCriteria(req.acceptanceCriteria),
  }));
}

export function fromRequirementSetToWizardState(
  set: import('../../api/types').RequirementSet,
  requirements: import('../../api/types').Requirement[],
): URSWizardState {
  return {
    requirementSetId: set.id,
    isDraft: true,
    dirty: false,
    businessCapabilityRefs: set.businessCapabilityRefs || [],
    businessNeed: {
      title: set.businessNeed,
      desiredOutcome: set.desiredOutcome,
      businessValue: set.businessValue,
      stakeholders: set.stakeholders,
    },
    context: {
      title: set.solutionName || set.businessNeed,
      scope: set.scope,
      outOfScope: set.outOfScope,
      processContext: set.processContext,
      gxpRelevance: set.gxpRelevance,
      patientImpact: set.patientImpact,
      dataIntegrityImpact: set.dataIntegrityImpact,
      electronicRecords: set.electronicRecords,
    },
    requirements: requirements.map(req => ({
      id: req.id,
      tempId: req.id,
      title: (req as any).title || req.statement.slice(0, 80),
      statement: req.statement,
      rationale: req.rationale,
      category: req.category,
      priority: req.priority,
      gxpRelevance: req.gxpRelevance,
      source: (req as any).source,
      owner: (req as any).owner,
      acceptanceCriteria: parseAcceptanceCriteria((req as any).acceptanceIntent),
    })),
    solutionType: set.solutionType,
    solutionName: set.solutionName,
    solutionCatalogRef: set.solutionCatalogRef,
    currentStep: 0,
  };
}

