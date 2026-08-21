export const CERTIFICATION_STATUSES = [
  'DEVELOPMENT',
  'TESTED',
  'CERTIFIED',
] as const;

export type CertificationStatus = (typeof CERTIFICATION_STATUSES)[number];
