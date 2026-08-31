export type CertificationTier =
  | 'Community'
  | 'Certified'
  | 'Validated'
  | 'Not applicable';

export function certificationTierFor(input: {
  validationStatus: string;
  validationReference?: string;
}): CertificationTier {
  if (input.validationStatus === 'VALIDATED') {
    return input.validationReference ? 'Validated' : 'Certified';
  }
  if (input.validationStatus === 'VALIDATION_IN_PROGRESS') {
    return 'Certified';
  }
  if (input.validationStatus === 'NOT_APPLICABLE') {
    return 'Not applicable';
  }
  return 'Community';
}
