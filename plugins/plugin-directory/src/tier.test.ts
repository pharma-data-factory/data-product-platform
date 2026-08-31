import { certificationTierFor } from './tier';

describe('certificationTierFor', () => {
  it('maps VALIDATED with a reference to Validated', () => {
    expect(
      certificationTierFor({
        validationStatus: 'VALIDATED',
        validationReference: 'some/reference.md',
      }),
    ).toBe('Validated');
  });

  it('maps VALIDATED without a reference to Certified', () => {
    expect(certificationTierFor({ validationStatus: 'VALIDATED' })).toBe(
      'Certified',
    );
  });

  it('maps VALIDATION_IN_PROGRESS to Certified', () => {
    expect(
      certificationTierFor({ validationStatus: 'VALIDATION_IN_PROGRESS' }),
    ).toBe('Certified');
  });

  it('maps NOT_VALIDATED to Community', () => {
    expect(certificationTierFor({ validationStatus: 'NOT_VALIDATED' })).toBe(
      'Community',
    );
  });

  it('maps NOT_ESTABLISHED to Community', () => {
    expect(certificationTierFor({ validationStatus: 'NOT_ESTABLISHED' })).toBe(
      'Community',
    );
  });

  it('maps unknown statuses to Community', () => {
    expect(certificationTierFor({ validationStatus: 'SOMETHING_ELSE' })).toBe(
      'Community',
    );
  });

  it('maps NOT_APPLICABLE to Not applicable', () => {
    expect(certificationTierFor({ validationStatus: 'NOT_APPLICABLE' })).toBe(
      'Not applicable',
    );
  });
});
