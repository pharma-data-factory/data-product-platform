import {
  parseAcceptanceCriteria,
  serializeAcceptanceCriteria,
  toDraftRequirementsPayload,
} from './wizardState';
import { RequirementPriority } from '../../api/types';

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
