import {
  parseAcceptanceCriteria,
  serializeAcceptanceCriteria,
  toDraftRequirementsPayload,
  validateStep,
  initializeWizardState,
} from './wizardState';
import { RequirementPriority, GxPRelevance, SolutionType } from '../../api/types';

describe('wizardState persistence helpers', () => {
  it('serializes and parses acceptance criteria', () => {
    const serialized = serializeAcceptanceCriteria([
      { tempId: 'ac-1', title: 'Given X, Then Y' },
    ]);
    expect(parseAcceptanceCriteria(serialized)).toEqual([
      expect.objectContaining({ title: 'Given X, Then Y' }),
    ]);
  });

  it('maps requirements to draft payload', () => {
    const payload = toDraftRequirementsPayload({
      isDraft: true,
      dirty: false,
      businessCapabilityRefs: ['business-capability:make/oee'],
      businessNeed: { title: 'Need' },
      context: {},
      requirements: [
        {
          tempId: 'req-1',
          title: 'Display state',
          statement: 'The system shall display state',
          priority: RequirementPriority.MUST,
          acceptanceCriteria: [{ tempId: 'ac-1', title: 'Visible within 500ms' }],
        },
      ],
      currentStep: 0,
    });

    expect(payload).toHaveLength(1);
    expect(payload[0].title).toBe('Display state');
    expect(payload[0].acceptanceIntent).toContain('Visible within 500ms');
  });
});

describe('validateStep (5-step wizard)', () => {
  it('requires capability and need on step 0', () => {
    const state = initializeWizardState();
    expect(validateStep(state, 0).isValid).toBe(false);
    expect(validateStep(state, 0).errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/capability/i),
        expect.stringMatching(/title/i),
        expect.stringMatching(/outcome/i),
      ]),
    );
  });

  it('requires requirements and AC on step 2', () => {
    const state = {
      ...initializeWizardState(),
      requirements: [
        {
          tempId: 'r1',
          title: 'T',
          statement: 'The system shall work',
          acceptanceCriteria: [],
        },
      ],
    };
    const result = validateStep(state, 2);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => /acceptance criteria/i.test(e))).toBe(true);
  });

  it('requires solution fields on step 4', () => {
    const state = {
      ...initializeWizardState(),
      solutionName: '',
      solutionType: undefined as SolutionType | undefined,
    };
    const result = validateStep(state, 4);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('quality review step is never blocking', () => {
    expect(validateStep(initializeWizardState(), 3).isValid).toBe(true);
  });

  it('passes step 0 when capability and need are complete', () => {
    const state = {
      ...initializeWizardState(),
      businessCapabilityRefs: ['cap-1'],
      businessNeed: {
        title: 'Need title',
        desiredOutcome: 'Outcome',
      },
      context: { gxpRelevance: GxPRelevance.NONE },
    };
    expect(validateStep(state, 0).isValid).toBe(true);
  });
});
