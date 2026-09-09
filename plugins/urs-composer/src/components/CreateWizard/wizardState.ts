/**
 * URS Create Wizard State Model
 * 
 * Manages the state of the 8-step wizard throughout creation.
 * Separates temporary editing state (React) from persisted state (backend).
 */

import {
  SolutionType,
  GxPRelevance,
  RequirementPriority,
  RequirementClassification,
  URSStatus,
} from '../../api/types';

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
  classification?: RequirementClassification;
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
  ursStatus?: URSStatus; // Status of the persisted set (edit mode)
  versionNumber?: number; // Version of the persisted set (edit mode)

  // === STEP 1: BUSINESS CAPABILITY ===
  businessCapabilityRefs: string[]; // Array of capability IDs
  selectedCapabilities?: Record<string, boolean>; // UI selection state

  // === STEP 2: BUSINESS NEED ===
  businessNeed: {
    title?: string;
    desiredOutcome?: string;
    businessValue?: string;
    stakeholders?: string[]; // Role IDs (role:<slug>) of the executing roles
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
    classification: req.classification,
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
    ursStatus: set.status,
    versionNumber: set.versionNumber,
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
      classification: (req as any).classification,
      acceptanceCriteria: parseAcceptanceCriteria((req as any).acceptanceIntent),
    })),
    solutionType: set.solutionType,
    solutionName: set.solutionName,
    solutionCatalogRef: set.solutionCatalogRef,
    currentStep: 0,
  };
}

export interface ImportValidationResult {
  valid: boolean;
  errors: string[];
  state?: URSWizardState;
}

export function fromImportJson(json: unknown): ImportValidationResult {
  const errors: string[] = [];

  if (Array.isArray(json)) {
    if (json.length === 1) {
      json = json[0];
    } else {
      return {
        valid: false,
        errors: [
          `File contains ${json.length} requirement sets; import supports one set per file`,
        ],
      };
    }
  }

  if (!json || typeof json !== 'object') {
    return { valid: false, errors: ['Invalid JSON: expected an object'] };
  }

  const obj = json as Record<string, unknown>;

  if (!Array.isArray(obj.businessCapabilityRefs) || obj.businessCapabilityRefs.length === 0) {
    errors.push('Missing or empty "businessCapabilityRefs" array');
  }
  if (typeof obj.businessNeed !== 'string' || !obj.businessNeed.trim()) {
    errors.push('Missing or empty "businessNeed" string');
  }
  if (typeof obj.solutionType !== 'string') {
    errors.push('Missing "solutionType" (COMPONENT, PROJECT, PLATFORM, SERVICE)');
  }
  if (typeof obj.solutionName !== 'string' || !obj.solutionName.trim()) {
    errors.push('Missing or empty "solutionName" string');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const reqs: RequirementDraft[] = [];
  if (Array.isArray(obj.requirements)) {
    for (let i = 0; i < obj.requirements.length; i++) {
      const r = obj.requirements[i] as Record<string, unknown>;
      if (!r || typeof r.title !== 'string' || typeof r.statement !== 'string') {
        errors.push(`requirements[${i}]: missing "title" or "statement"`);
        continue;
      }
      reqs.push({
        tempId: createTempId(),
        title: r.title,
        statement: r.statement,
        rationale: typeof r.rationale === 'string' ? r.rationale : undefined,
        category: typeof r.category === 'string' ? r.category : undefined,
        priority: r.priority as RequirementPriority | undefined,
        gxpRelevance: r.gxpRelevance as GxPRelevance | undefined,
        source: typeof r.source === 'string' ? r.source : undefined,
        owner: typeof r.owner === 'string' ? r.owner : undefined,
        classification: r.classification as RequirementClassification | undefined,
        acceptanceCriteria: Array.isArray(r.acceptanceCriteria)
          ? (r.acceptanceCriteria as Record<string, unknown>[]).map(ac => ({
              tempId: createTempId(),
              title: String(ac.title || ''),
              description: ac.description ? String(ac.description) : undefined,
              verificationMethod: ac.verificationMethod ? String(ac.verificationMethod) : undefined,
            }))
          : undefined,
      });
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const state: URSWizardState = {
    isDraft: false,
    dirty: true,
    businessCapabilityRefs: obj.businessCapabilityRefs as string[],
    businessNeed: {
      title: obj.businessNeed as string,
      desiredOutcome: typeof obj.desiredOutcome === 'string' ? obj.desiredOutcome : undefined,
      businessValue: typeof obj.businessValue === 'string' ? obj.businessValue : undefined,
      stakeholders: Array.isArray(obj.stakeholders) ? obj.stakeholders as string[] : undefined,
    },
    context: {
      title: (obj.solutionName as string) || (obj.businessNeed as string),
      scope: typeof obj.scope === 'string' ? obj.scope : undefined,
      outOfScope: typeof obj.outOfScope === 'string' ? obj.outOfScope : undefined,
      processContext: typeof obj.processContext === 'string' ? obj.processContext : undefined,
      gxpRelevance: obj.gxpRelevance as GxPRelevance | undefined,
      patientImpact: typeof obj.patientImpact === 'boolean' ? obj.patientImpact : undefined,
      dataIntegrityImpact: typeof obj.dataIntegrityImpact === 'boolean' ? obj.dataIntegrityImpact : undefined,
      electronicRecords: typeof obj.electronicRecords === 'boolean' ? obj.electronicRecords : undefined,
    },
    requirements: reqs,
    solutionType: obj.solutionType as SolutionType,
    solutionName: obj.solutionName as string,
    solutionCatalogRef: typeof obj.solutionCatalogRef === 'string' ? obj.solutionCatalogRef : undefined,
    currentStep: 0,
  };

  return { valid: true, errors: [], state };
}

