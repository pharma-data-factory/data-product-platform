import {
  COMPONENT_TYPES,
  CRITICALITIES,
  DATA_CLASSIFICATIONS,
  isComponentType,
  isCriticality,
  isRequirementNature,
  isValidationLevel,
} from './classification';

describe('classification vocabulary', () => {
  it('exposes the blackbox component types', () => {
    expect(COMPONENT_TYPES).toContain('INPUT_PORT');
    expect(COMPONENT_TYPES).toContain('OUTPUT_PORT');
    expect(COMPONENT_TYPES).toContain('DATA_CONTRACT');
    expect(COMPONENT_TYPES).toContain('CROSS_CUTTING');
    expect(COMPONENT_TYPES).toHaveLength(12);
  });

  it('guards componentType values', () => {
    expect(isComponentType('PROCESSING')).toBe(true);
    expect(isComponentType('NOT_A_TYPE')).toBe(false);
  });

  it('guards the remaining vocabularies', () => {
    expect(isRequirementNature('COMPLIANCE')).toBe(true);
    expect(isRequirementNature('BOGUS')).toBe(false);
    expect(isCriticality('CRITICAL')).toBe(true);
    expect(isCriticality('SUPER')).toBe(false);
    expect(isValidationLevel('IQ')).toBe(true);
    expect(isValidationLevel('SMOKE')).toBe(false);
  });

  it('covers the data classification vocabulary', () => {
    expect(DATA_CLASSIFICATIONS).toEqual([
      'PUBLIC',
      'INTERNAL',
      'CONFIDENTIAL',
      'RESTRICTED',
    ]);
    expect(CRITICALITIES).toEqual(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
  });
});
